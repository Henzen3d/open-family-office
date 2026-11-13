"""Financial Reports and Analytics Manager for OpenFamilyOffice.

Calculates deterministic MEI statutory ceilings, 20% tolerance boundaries (Art. 14 LC 123/2006),
monthly runways, and real multi-entity liquidity distributions.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.controller.account_manager import AccountManager
from src.controller.ledger_manager import LedgerManager
from src.controller.portfolio_manager import PortfolioManager


class ReportsManager:
    """Calculates MEI statutory limits, entity-level liquidity, and historical rollups."""

    MEI_ANNUAL_CEILING_2026 = 81000.00
    MEI_TOLERANCE_PCT = 0.20  # 20% statutory tolerance under Art. 14 of LC 123/2006
    MEI_TOLERANCE_CEILING_2026 = 81000.00 * 1.20  # R$ 97,200.00

    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = Path(data_dir) if data_dir else Path("data")
        ledger_file = self.data_dir / "ledger" / "transactions.csv"
        self.ledger_mgr = LedgerManager(ledger_file=str(ledger_file))
        self.account_mgr = AccountManager(data_dir=str(self.data_dir))
        self.portfolio_mgr = PortfolioManager(data_dir=str(self.data_dir))

    def calculate_mei_status(self, year: int = 2026) -> Dict[str, Any]:
        """Calculates actual YTD revenue from transactions.csv for FIX_SERVICOS and FACILITA_VISTORIAS.

        Applies statutory framework:
        - LC 123/2006 (Art. 14, §§ 1º e 2º; Art. 18-A) & LC 238/2026.
        - Statutory Annual Ceiling: R$ 81,000.00 por CNPJ.
        - 20% Tolerance Boundary: R$ 97,200.00 (R$ 81.000,00 * 1,20).
        - Real revenue: positive inflows from transactions.csv excluding neutralized transfers.
        - Monthly pace, runway until ceiling exhaustion, and legal status warnings.
        """
        transactions = self.ledger_mgr.load_transactions()

        # Monthly revenue distribution (months 1..12 -> index 0..11)
        monthly_fix = [0.0] * 12
        monthly_facilita = [0.0] * 12

        rev_fix = 0.0
        rev_facilita = 0.0
        count_fix = 0
        count_facilita = 0

        for t in transactions:
            # Match target year
            if getattr(t.date, "year", None) != year:
                continue

            # Neutralized transfers do not count as commercial revenue
            if getattr(t, "is_transfer", False):
                continue

            # Revenue must be client inflow (positive transaction amount)
            amt = float(t.amount)
            if amt <= 0:
                continue

            ent = (getattr(t, "entity_code", "") or "").upper().strip()
            month_idx = t.date.month - 1

            if ent == "FIX_SERVICOS":
                rev_fix += amt
                count_fix += 1
                if 0 <= month_idx < 12:
                    monthly_fix[month_idx] += amt
            elif ent == "FACILITA_VISTORIAS":
                rev_facilita += amt
                count_facilita += 1
                if 0 <= month_idx < 12:
                    monthly_facilita[month_idx] += amt

        # Elapsed months in current calendar year for monthly pace calculation
        now = datetime.now(timezone.utc)
        if year == now.year:
            elapsed_months = max(1, now.month)
        else:
            elapsed_months = 12

        ceiling = self.MEI_ANNUAL_CEILING_2026
        tolerance = self.MEI_TOLERANCE_CEILING_2026

        def _build_entity_summary(
            code: str,
            label: str,
            titular: str,
            rev: float,
            count: int,
            monthly_dist: List[float],
            alternate_entity: str,
        ) -> Dict[str, Any]:
            rev_round = round(rev, 2)
            pct_used = round((rev / ceiling) * 100.0, 2) if ceiling > 0 else 0.0
            margin = max(0.0, round(ceiling - rev, 2))
            tolerance_margin = max(0.0, round(tolerance - rev, 2))
            monthly_avg = round(rev / elapsed_months, 2)

            exceeded_ceiling = rev > ceiling
            exceeded_20 = rev > tolerance

            if exceeded_20:
                status = "EXCEEDED_20_PERCENT"
                severity = "danger"
                warning = (
                    f"CRÍTICO: O faturamento de {label} acumulou R$ {rev_round:,.2f}, ultrapassando o teto de "
                    f"R$ {ceiling:,.2f} em mais de 20% (limite de tolerância de R$ {tolerance:,.2f} superado). "
                    f"Conforme o Art. 14, § 1º da LC 123/2006, o desenquadramento do MEI é compulsório com efeitos "
                    f"retroativos a 1º de janeiro do ano-calendário corrente, sujeitando a empresa à tributação "
                    f"pelo Simples Nacional (ME) com recolhimento retroativo da diferença de alíquotas e encargos legais."
                )
                runway_months = 0.0
                recommendation = (
                    f"Iniciar transição contábil formal para Microempresa (ME). "
                    f"Interromper novas emissões neste CNPJ e redirecionar novos serviços para {alternate_entity}."
                )
            elif exceeded_ceiling:
                status = "EXCEEDED_CEILING"
                severity = "warning"
                warning = (
                    f"ALERTA: O faturamento de {label} atingiu R$ {rev_round:,.2f}, excedendo o teto de R$ {ceiling:,.2f}, "
                    f"porém mantendo-se dentro da margem de tolerância de 20% (até R$ {tolerance:,.2f}). "
                    f"Conforme o Art. 14, § 2º da LC 123/2006, o desenquadramento do MEI produzirá efeitos apenas "
                    f"a partir de 1º de janeiro do ano-calendário subsequente, sem penalidades retroativas."
                )
                runway_months = 0.0
                recommendation = (
                    f"Cessar emissões adicionais neste CNPJ para não violar o limite de R$ {tolerance:,.2f}. "
                    f"Redirecionar contratos e faturamentos para {alternate_entity}."
                )
            elif pct_used >= 80.0:
                status = "CAUTION_80"
                severity = "caution"
                runway_months = round(margin / monthly_avg, 1) if monthly_avg > 0 else 0.0
                warning = (
                    f"ATENÇÃO: {label} atingiu {pct_used:.1f}% do teto anual (R$ {rev_round:,.2f} emitidos de R$ {ceiling:,.2f}). "
                    f"Margem restante de R$ {margin:,.2f} (capacidade estimada para {runway_months} meses no ritmo atual)."
                )
                recommendation = (
                    f"Acompanhar emissões mensais e redirecionar novos clientes para {alternate_entity} "
                    f"para preservar o regime tributário simplificado."
                )
            else:
                status = "SAFE"
                severity = "safe"
                runway_months = round(margin / monthly_avg, 1) if monthly_avg > 0 else float(12 - elapsed_months)
                warning = f"REGULAR: Faturamento de {label} em conformidade legal (utilizados {pct_used:.1f}% do teto anual)."
                recommendation = f"Operação normal. Margem disponível de R$ {margin:,.2f} para faturamento em {year}."

            projected_annual = round(monthly_avg * 12, 2)

            return {
                "entity_code": code,
                "label": label,
                "titular": titular,
                "tax_year": year,
                "annual_ceiling": ceiling,
                "gross_revenue_ytd": rev_round,
                "formatted_revenue_ytd": f"R$ {rev_round:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
                "margin_remaining": margin,
                "formatted_margin_remaining": f"R$ {margin:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
                "percentage_used": pct_used,
                "tolerance_ceiling_20pct": tolerance,
                "formatted_tolerance_ceiling": f"R$ {tolerance:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
                "tolerance_margin_remaining": tolerance_margin,
                "monthly_average": monthly_avg,
                "formatted_monthly_average": f"R$ {monthly_avg:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
                "monthly_runway_months": runway_months,
                "projected_annual_revenue": projected_annual,
                "transactions_count": count,
                "monthly_breakdown": [round(m, 2) for m in monthly_dist],
                "exceeded_ceiling": exceeded_ceiling,
                "exceeded_20pct_tolerance": exceeded_20,
                "status": status,
                "severity": severity,
                "tolerance_warning": warning,
                "recommendation": recommendation,
                "legal_basis": "Art. 14 e Art. 18-A da Lei Complementar nº 123/2006; LC 238/2026",
            }

        fix_summary = _build_entity_summary(
            code="FIX_SERVICOS",
            label="Fix Serviços MEI",
            titular="Osmar",
            rev=rev_fix,
            count=count_fix,
            monthly_dist=monthly_fix,
            alternate_entity="Facilita Vistorias MEI (Vera)",
        )

        facilita_summary = _build_entity_summary(
            code="FACILITA_VISTORIAS",
            label="Facilita Vistorias MEI",
            titular="Vera",
            rev=rev_facilita,
            count=count_facilita,
            monthly_dist=monthly_facilita,
            alternate_entity="Fix Serviços MEI (Osmar)",
        )

        total_mei_rev = round(rev_fix + rev_facilita, 2)
        combined_capacity = ceiling * 2.0  # R$ 162,000.00
        combined_margin = max(0.0, round(combined_capacity - total_mei_rev, 2))
        combined_pct = round((total_mei_rev / combined_capacity) * 100.0, 2) if combined_capacity > 0 else 0.0

        return {
            "tax_year": year,
            "annual_ceiling_per_cnpj": ceiling,
            "formatted_annual_ceiling": f"R$ {ceiling:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "combined_annual_capacity": combined_capacity,
            "formatted_combined_capacity": f"R$ {combined_capacity:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "tolerance_ceiling_20pct": tolerance,
            "formatted_tolerance_ceiling": f"R$ {tolerance:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "total_revenue_mei_ytd": total_mei_rev,
            "formatted_total_revenue_mei_ytd": f"R$ {total_mei_rev:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "combined_margin_remaining": combined_margin,
            "formatted_combined_margin_remaining": f"R$ {combined_margin:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "combined_percentage_used": combined_pct,
            "entities": {
                "FIX_SERVICOS": fix_summary,
                "FACILITA_VISTORIAS": facilita_summary,
            },
            "fix_servicos": fix_summary,
            "facilita_vistorias": facilita_summary,
            "conjugal_segregation": {
                "active": True,
                "osmar_titular_fix": True,
                "vera_titular_facilita": True,
                "anti_partner_conflict": False,
                "legal_notes": (
                    "Titularidades individuais autônomas (Art. 18-A LC 123/2006). "
                    "Casal possui dois CNPJs segregados sem vedação societária ou confusão patrimonial."
                ),
            },
        }

    def get_liquidity_report(self) -> Dict[str, Any]:
        """Calculates multi-entity real cash liquidity, bank account distributions, and global net worth."""
        accounts = self.account_mgr.load_accounts()
        active_accounts = [a for a in accounts if a.active]
        total_cash_brl = round(sum(a.balance for a in active_accounts), 2)

        entity_breakdown: Dict[str, Dict[str, Any]] = {}
        for a in active_accounts:
            code = a.entity_code.upper().strip()
            pct = round((a.balance / total_cash_brl * 100.0), 2) if total_cash_brl > 0 else 0.0
            entity_breakdown[code] = {
                "entity_code": code,
                "account_id": a.id,
                "account_name": a.name,
                "bank_name": a.bank_name,
                "holder": a.holder,
                "purpose": a.purpose,
                "balance": round(a.balance, 2),
                "formatted_balance": f"R$ {a.balance:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
                "percentage_of_cash": pct,
                "color": a.color,
            }

        portfolio_summary = self.portfolio_mgr.get_summary()
        port_dict = portfolio_summary.to_dict()

        total_net_worth_brl = round(total_cash_brl + port_dict.get("total_brl", 0.0), 2)

        return {
            "total_cash_brl": total_cash_brl,
            "formatted_total_cash_brl": f"R$ {total_cash_brl:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "total_net_worth_brl": total_net_worth_brl,
            "formatted_total_net_worth_brl": f"R$ {total_net_worth_brl:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "foreign_assets": {
                "total_usd": port_dict.get("total_usd", 0.0),
                "total_brl": port_dict.get("total_brl", 0.0),
                "ptax_rate": port_dict.get("ptax_rate", 5.82),
                "positions_count": port_dict.get("positions_count", 0),
                "cbe_status": port_dict.get("cbe_status", "Isento"),
            },
            "by_entity": entity_breakdown,
            "accounts": [a.to_dict() for a in accounts],
        }
