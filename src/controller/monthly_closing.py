"""Monthly Closing Auditor & MEI Tax Settlement Engine inspired by Clara's Zero-Rework Closing."""
from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional
import calendar

from src.models.transactions import Transaction
from src.engine.spend_compliance import SpendComplianceEngine


MEI_ANNUAL_CEILING = Decimal("81000.00")
MEI_PRESUMPTION_SERVICES_RATE = Decimal("0.32")  # 32% presunção IRPF para serviços (LC 123/2006 art. 14)


@dataclass
class MeiMonthlySummary:
    entity_code: str
    entity_name: str
    month: int
    year: int
    gross_revenue_month: float
    gross_revenue_ytd: float
    annual_ceiling: float
    ceiling_used_percent: float
    remaining_ceiling: float
    monthly_runway_status: str  # "SAFE", "WARNING", "CRITICAL"
    documented_expenses_month: float
    net_operating_profit_month: float
    exempt_profit_distribution: float
    das_estimated: float
    report_ready: bool


@dataclass
class MonthlyClosingAuditReport:
    month: int
    year: int
    period_label: str
    closing_status: str  # "COMPLETED", "READY_TO_CLOSE", "PENDING_ITEMS"
    active_accounts: List[str]
    total_transactions_count: int
    total_inflows: float
    total_outflows: float
    documentation_rate: float
    missing_receipts_count: int
    missing_receipts_amount: float
    segregation_alerts_count: int
    segregation_alerts: List[Dict[str, any]]
    potential_duplicates_count: int
    potential_duplicates: List[any]
    mei_summaries: Dict[str, MeiMonthlySummary]
    checklist: Dict[str, bool]


class MonthlyClosingAuditor:
    """Performs end-to-end month-end closing audits for household and MEIs."""

    def __init__(self, compliance_engine: Optional[SpendComplianceEngine] = None):
        self.compliance_engine = compliance_engine or SpendComplianceEngine()

    def audit_month(
        self,
        transactions: List[Transaction],
        receipt_tx_ids: set[str],
        year: int,
        month: int,
    ) -> MonthlyClosingAuditReport:
        """Audits all ledger movements for the specified month and year."""
        # 1. Filter transactions for the requested month
        month_txs = [
            tx for tx in transactions
            if tx.date.year == year and tx.date.month == month
        ]

        # All YTD transactions up to this month for MEI ceiling calculation
        ytd_txs = [
            tx for tx in transactions
            if tx.date.year == year and tx.date.month <= month
        ]

        # Audit with compliance engine
        compliance_audit = self.compliance_engine.audit_batch(month_txs, receipt_tx_ids)

        # Accounts active in this month
        active_accounts = sorted(list({tx.account_name for tx in month_txs if tx.account_name}))

        # Financial totals
        total_inflows = Decimal("0.00")
        total_outflows = Decimal("0.00")
        for tx in month_txs:
            if not tx.is_transfer:
                if tx.amount > Decimal("0.00"):
                    total_inflows += tx.amount
                else:
                    total_outflows += abs(tx.amount)

        # MEI Summaries for FIX_SERVICOS and FACILITA_VISTORIAS
        mei_summaries: Dict[str, MeiMonthlySummary] = {}
        for code, name in [
            ("FIX_SERVICOS", "FIX Serviços (Osmar)"),
            ("FACILITA_VISTORIAS", "Facilita Vistorias (Vera)"),
        ]:
            # Monthly revenue (inflows that are not transfers)
            month_rev = sum(
                (tx.amount for tx in month_txs if tx.entity_code == code and not tx.is_transfer and tx.amount > 0),
                Decimal("0.00"),
            )
            # YTD revenue
            ytd_rev = sum(
                (tx.amount for tx in ytd_txs if tx.entity_code == code and not tx.is_transfer and tx.amount > 0),
                Decimal("0.00"),
            )
            # Monthly documented operating expenses
            month_expenses = sum(
                (abs(tx.amount) for tx in month_txs if tx.entity_code == code and not tx.is_transfer and tx.amount < 0),
                Decimal("0.00"),
            )

            ceiling_used_pct = float(round((ytd_rev / MEI_ANNUAL_CEILING) * 100, 2)) if MEI_ANNUAL_CEILING > 0 else 0.0
            remaining_ceil = float(MEI_ANNUAL_CEILING - ytd_rev)

            # Runway status based on month of year
            expected_pct = (month / 12) * 100
            if ceiling_used_pct > 100:
                runway_status = "CRITICAL"
            elif ceiling_used_pct > expected_pct + 15:
                runway_status = "WARNING"
            else:
                runway_status = "SAFE"

            # Net operating profit
            net_profit = month_rev - month_expenses

            # Legal exempt profit calculation (art. 14 LC 123/2006)
            # Standard presumption without accounting: 32% of gross revenue
            # With documented accounting (OpenFamilyOffice): Gross revenue - documented expenses
            # Legally: whichever is higher if documented, minimum 32% presunção
            presumed_exempt = month_rev * MEI_PRESUMPTION_SERVICES_RATE
            max_exempt = max(presumed_exempt, net_profit) if net_profit > 0 else Decimal("0.00")

            # Estimated DAS MEI (approx R$ 75,00 in 2026 for services)
            das_estimated = 75.60 if month_rev > 0 or ytd_rev > 0 else 0.00

            mei_summaries[code] = MeiMonthlySummary(
                entity_code=code,
                entity_name=name,
                month=month,
                year=year,
                gross_revenue_month=float(month_rev),
                gross_revenue_ytd=float(ytd_rev),
                annual_ceiling=float(MEI_ANNUAL_CEILING),
                ceiling_used_percent=ceiling_used_pct,
                remaining_ceiling=remaining_ceil,
                monthly_runway_status=runway_status,
                documented_expenses_month=float(month_expenses),
                net_operating_profit_month=float(net_profit),
                exempt_profit_distribution=float(round(max_exempt, 2)),
                das_estimated=das_estimated,
                report_ready=True,
            )

        # Checklist determination
        has_txs = len(month_txs) > 0
        doc_rate = compliance_audit["documentation_rate"]
        missing_count = compliance_audit["pending_receipts"]["count"]
        seg_alerts = compliance_audit["segregation_alerts"]["personal_on_mei"]

        checklist = {
            "statements_imported": has_txs,
            "transfers_neutralized": True,  # Already maintained by LedgerManager / CardReconciler
            "receipts_fully_documented": doc_rate >= 80.0 and missing_count <= 2,
            "segregation_clean": len(seg_alerts) == 0,
            "mei_ceilings_safe": all(s.monthly_runway_status != "CRITICAL" for s in mei_summaries.values()),
        }

        # Overall closing status
        if all(checklist.values()):
            closing_status = "READY_TO_CLOSE"
        elif not has_txs:
            closing_status = "PENDING_ITEMS"
        else:
            closing_status = "PENDING_ITEMS"

        month_name = calendar.month_name[month]
        period_label = f"{month_name.capitalize()} / {year}"

        return MonthlyClosingAuditReport(
            month=month,
            year=year,
            period_label=period_label,
            closing_status=closing_status,
            active_accounts=active_accounts,
            total_transactions_count=len(month_txs),
            total_inflows=float(total_inflows),
            total_outflows=float(total_outflows),
            documentation_rate=doc_rate,
            missing_receipts_count=missing_count,
            missing_receipts_amount=compliance_audit["pending_receipts"]["total_amount"],
            segregation_alerts_count=len(seg_alerts),
            segregation_alerts=seg_alerts,
            potential_duplicates_count=compliance_audit["potential_duplicates_count"],
            potential_duplicates=compliance_audit["potential_duplicates"],
            mei_summaries=mei_summaries,
            checklist=checklist,
        )

