"""Historical Expense Estimator and Accounting Gap Reconstruction Engine.

Addresses unlogged months and missing expenses (such as groceries, bills, and supplies)
by computing robust category averages from populated months and generating provisional,
auditable transactions flagged with reconciliation_status = "ESTIMATED".
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, asdict
from datetime import date, datetime, timedelta
from decimal import Decimal
import os
from pathlib import Path
import time
from typing import Dict, List, Optional, Tuple, Any

from src.models.transactions import Transaction
from src.models.enums import ReconciliationStatus
from src.controller.ledger_manager import LedgerManager


@dataclass
class CategoryEstimate:
    entity_code: str
    category_code: str
    monthly_average: float
    sample_months_count: int
    account_name: str
    typical_counterparty: str


@dataclass
class GapMonthPlan:
    year: int
    month: int
    year_month: str
    existing_transactions_count: int
    existing_expenses_total: float
    proposed_estimates_count: int
    proposed_expenses_total: float
    proposals: List[Dict[str, Any]]


class ExpenseEstimatorEngine:
    """Computes statistical monthly expense averages and generates provisional estimated transactions."""

    def __init__(self, ledger_manager: Optional[LedgerManager] = None):
        self.ledger_manager = ledger_manager or LedgerManager()

    def compute_category_averages(
        self,
        transactions: Optional[List[Transaction]] = None,
        min_monthly_expenses: float = 50.0,
    ) -> Dict[str, CategoryEstimate]:
        """Calculates monthly average spending per (entity_code, category_code) from existing transactions."""
        txs = transactions if transactions is not None else self.ledger_manager.load_transactions()

        # Group negative amounts (expenses) by (entity_code, category_code, year_month)
        monthly_category_spend: Dict[Tuple[str, str], Dict[str, float]] = defaultdict(lambda: defaultdict(float))
        category_accounts: Dict[Tuple[str, str], Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        category_counterparties: Dict[Tuple[str, str], Dict[str, int]] = defaultdict(lambda: defaultdict(int))

        for tx in txs:
            # Skip transfers and revenues; only analyze real expenses (amount < 0)
            if tx.is_transfer or tx.amount >= 0:
                continue
            # Skip existing synthetic estimates when calculating the natural baseline
            if tx.reconciliation_status == ReconciliationStatus.ESTIMATED:
                continue

            entity = tx.entity_code or "HOUSEHOLD_OSMAR"
            cat = tx.category_code or "Outros"
            ym = tx.date.strftime("%Y-%m")
            val = abs(float(tx.amount))

            monthly_category_spend[(entity, cat)][ym] += val
            category_accounts[(entity, cat)][tx.account_name] += 1
            if tx.counterparty:
                category_counterparties[(entity, cat)][tx.counterparty] += 1

        results: Dict[str, CategoryEstimate] = {}

        for (entity, cat), months_dict in monthly_category_spend.items():
            valid_months = [v for v in months_dict.values() if v >= min_monthly_expenses]
            if not valid_months:
                continue
            avg_val = round(sum(valid_months) / len(valid_months), 2)

            # Determine dominant account and counterparty
            accts = category_accounts.get((entity, cat), {})
            best_acct = max(accts, key=accts.get) if accts else "Conta Geral"

            cpties = category_counterparties.get((entity, cat), {})
            best_cpty = max(cpties, key=cpties.get) if cpties else f"Despesas de {cat}"

            key = f"{entity}::{cat}"
            results[key] = CategoryEstimate(
                entity_code=entity,
                category_code=cat,
                monthly_average=avg_val,
                sample_months_count=len(valid_months),
                account_name=best_acct,
                typical_counterparty=best_cpty,
            )

        # Ensure default essential categories exist for household if historical data is scarce
        if "HOUSEHOLD_OSMAR::Supermercado" not in results:
            results["HOUSEHOLD_OSMAR::Supermercado"] = CategoryEstimate(
                entity_code="HOUSEHOLD_OSMAR",
                category_code="Supermercado",
                monthly_average=1850.00,
                sample_months_count=1,
                account_name="Nubank PF",
                typical_counterparty="Supermercado Geral",
            )
        if "HOUSEHOLD_OSMAR::Moradia" not in results:
            results["HOUSEHOLD_OSMAR::Moradia"] = CategoryEstimate(
                entity_code="HOUSEHOLD_OSMAR",
                category_code="Moradia",
                monthly_average=450.00,
                sample_months_count=1,
                account_name="Nubank PF",
                typical_counterparty="Contas de Consumo (Luz/Água/Net)",
            )

        return results

    def identify_gap_months(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        min_tx_count: int = 4,
    ) -> List[GapMonthPlan]:
        """Scans the timeline for months lacking sufficient transaction records."""
        txs = self.ledger_manager.load_transactions()
        averages = self.compute_category_averages(txs)

        # Determine timeframe (ignore legacy corrupted dates prior to 2024)
        if txs:
            real_dates = [
                t.date for t in txs
                if t.reconciliation_status != ReconciliationStatus.ESTIMATED and t.date.year >= 2024
            ]
            first_date = min(real_dates) if real_dates else (date.today() - timedelta(days=180))
        else:
            first_date = date.today() - timedelta(days=180)

        dt_start = start_date or first_date
        dt_end = end_date or date.today()

        # Aggregate monthly activity
        month_activity: Dict[str, List[Transaction]] = defaultdict(list)
        for t in txs:
            if t.reconciliation_status != ReconciliationStatus.ESTIMATED and t.amount < 0:
                ym = t.date.strftime("%Y-%m")
                month_activity[ym].append(t)

        gap_plans: List[GapMonthPlan] = []

        curr_y = dt_start.year
        curr_m = dt_start.month
        end_y = dt_end.year
        end_m = dt_end.month

        while (curr_y < end_y) or (curr_y == end_y and curr_m <= end_m):
            ym = f"{curr_y:04d}-{curr_m:02d}"
            existing_tx = month_activity.get(ym, [])
            tx_count = len(existing_tx)
            existing_total = sum(abs(float(t.amount)) for t in existing_tx)

            # Check if this month qualifies as a gap month (less than min_tx_count transactions)
            if tx_count < min_tx_count:
                # Build proposals for missing categories
                existing_cats = {t.category_code for t in existing_tx}
                proposals = []
                proposed_total = 0.0

                for key, est in averages.items():
                    if est.category_code not in existing_cats:
                        # Schedule provisional entry on the 15th of the gap month
                        target_day = 15
                        prop_date = f"{curr_y:04d}-{curr_m:02d}-{target_day:02d}"
                        amount_neg = -abs(est.monthly_average)
                        proposed_total += abs(est.monthly_average)

                        proposals.append({
                            "temp_id": f"EST-{ym}-{est.category_code.replace(' ', '_')}",
                            "date": prop_date,
                            "entity_code": est.entity_code,
                            "account_name": est.account_name,
                            "category_code": est.category_code,
                            "counterparty": est.typical_counterparty,
                            "clean_description": f"Estimativa Provisória: {est.category_code} (Média Histórica)",
                            "amount": amount_neg,
                            "reconciliation_status": "ESTIMATED",
                            "notes": f"Lançamento estimado pela média histórica ({est.sample_months_count} meses base) — pendente comprovação real",
                        })

                if proposals:
                    gap_plans.append(GapMonthPlan(
                        year=curr_y,
                        month=curr_m,
                        year_month=ym,
                        existing_transactions_count=tx_count,
                        existing_expenses_total=round(existing_total, 2),
                        proposed_estimates_count=len(proposals),
                        proposed_expenses_total=round(proposed_total, 2),
                        proposals=proposals,
                    ))

            # Move to next month
            if curr_m == 12:
                curr_y += 1
                curr_m = 1
            else:
                curr_m += 1

        return gap_plans

    def apply_estimated_proposals(self, gap_plans: List[GapMonthPlan]) -> List[Transaction]:
        """Commits proposed estimated transactions into the ledger."""
        all_txs = self.ledger_manager.load_transactions()
        created: List[Transaction] = []

        now_ts = int(time.time() * 1000)
        counter = 0

        for plan in gap_plans:
            for p in plan.proposals:
                counter += 1
                tx_id = f"TX-EST-{now_ts}-{counter}"
                tx_date = datetime.strptime(p["date"], "%Y-%m-%d").date()

                tx = Transaction(
                    id=tx_id,
                    entity_code=p["entity_code"],
                    account_name=p["account_name"],
                    date=tx_date,
                    amount=Decimal(str(p["amount"])),
                    currency="BRL",
                    raw_description=f"Auto-estimativa contábil: {p['category_code']}",
                    clean_description=p["clean_description"],
                    category_code=p["category_code"],
                    counterparty=p["counterparty"],
                    is_transfer=False,
                    reconciliation_status=ReconciliationStatus.ESTIMATED,
                    notes=p["notes"],
                )
                created.append(tx)

        if created:
            # Prepend new estimated entries and save
            combined = created + all_txs
            self.ledger_manager.save_transactions(combined)

        return created
