"""OpenFamilyOffice — United States Tax and Wealth Engine.
Supports US Native and Expatriate compliance:
- Tax-Advantaged Accounts (401k, Roth IRA, Traditional IRA, HSA)
- IRS Schedule D Capital Gains Classifier (Short-Term vs Long-Term)
- Form W-8BEN 3-Year Validity Tracker
"""
from __future__ import annotations

from datetime import datetime, date, timezone
from typing import Any, Dict, List, Optional


class TaxAdvantagedAccountsTracker:
    """Tracks annual IRS contribution limits and tax deductions for US accounts."""

    # 2026/2025 IRS Limits
    LIMITS_2026 = {
        "401k_standard": 23500.0,
        "401k_catchup_50plus": 7500.0,
        "ira_standard": 7000.0,
        "ira_catchup_50plus": 1000.0,
        "hsa_individual": 4300.0,
        "hsa_family": 8550.0,
        "hsa_catchup_55plus": 1000.0,
    }

    @classmethod
    def evaluate_contributions(
        cls,
        contributed_401k: float = 14500.0,
        contributed_ira: float = 7000.0,
        contributed_hsa: float = 4300.0,
        age: int = 42,
        is_family_hsa: bool = True,
        effective_tax_rate: float = 24.0,  # 24% US federal bracket
    ) -> Dict[str, Any]:
        """Calculates utilization of US tax-advantaged buckets and tax savings."""
        limit_401k = cls.LIMITS_2026["401k_standard"] + (
            cls.LIMITS_2026["401k_catchup_50plus"] if age >= 50 else 0.0
        )
        limit_ira = cls.LIMITS_2026["ira_standard"] + (
            cls.LIMITS_2026["ira_catchup_50plus"] if age >= 50 else 0.0
        )
        limit_hsa = (
            cls.LIMITS_2026["hsa_family"] if is_family_hsa else cls.LIMITS_2026["hsa_individual"]
        ) + (cls.LIMITS_2026["hsa_catchup_55plus"] if age >= 55 else 0.0)

        rem_401k = max(0.0, limit_401k - contributed_401k)
        rem_ira = max(0.0, limit_ira - contributed_ira)
        rem_hsa = max(0.0, limit_hsa - contributed_hsa)

        # Tax savings calculation (Pre-tax 401k + HSA deductions)
        pretax_deductions = contributed_401k + contributed_hsa
        federal_tax_saved = pretax_deductions * (effective_tax_rate / 100.0)

        return {
            "age": age,
            "effective_tax_bracket_percent": effective_tax_rate,
            "accounts": {
                "401k": {
                    "name": "401(k) Pre-Tax",
                    "contributed": round(contributed_401k, 2),
                    "annual_limit": round(limit_401k, 2),
                    "remaining_margin": round(rem_401k, 2),
                    "percentage_filled": round((contributed_401k / limit_401k) * 100, 1),
                    "benefit_type": "Pre-tax deduction + tax-deferred compounding",
                },
                "roth_ira": {
                    "name": "Roth IRA",
                    "contributed": round(contributed_ira, 2),
                    "annual_limit": round(limit_ira, 2),
                    "remaining_margin": round(rem_ira, 2),
                    "percentage_filled": round((contributed_ira / limit_ira) * 100, 1),
                    "benefit_type": "100% tax-free growth and tax-free withdrawals in retirement",
                },
                "hsa": {
                    "name": "Health Savings Account (HSA)",
                    "contributed": round(contributed_hsa, 2),
                    "annual_limit": round(limit_hsa, 2),
                    "remaining_margin": round(rem_hsa, 2),
                    "percentage_filled": round((contributed_hsa / limit_hsa) * 100, 1),
                    "benefit_type": "Triple-tax advantage (deductible, tax-free growth, tax-free medical withdrawals)",
                },
            },
            "total_contributed": round(contributed_401k + contributed_ira + contributed_hsa, 2),
            "estimated_federal_tax_saved_this_year": round(federal_tax_saved, 2),
        }


class ScheduleDClassifier:
    """IRS Schedule D: Classifies capital gains/losses into Short-Term (< 1 year) or Long-Term (>= 1 year)."""

    @staticmethod
    def classify(
        asset_symbol: str,
        purchase_date_str: str,  # "YYYY-MM-DD"
        sale_date_str: str,      # "YYYY-MM-DD"
        purchase_price: float,
        sale_price: float,
        quantity: float = 1.0,
    ) -> Dict[str, Any]:
        """Calculates holding period, capital gain/loss, and Schedule D classification."""
        p_date = datetime.strptime(purchase_date_str, "%Y-%m-%d").date()
        s_date = datetime.strptime(sale_date_str, "%Y-%m-%d").date()

        holding_days = (s_date - p_date).days
        total_cost = purchase_price * quantity
        total_proceeds = sale_price * quantity
        gain_or_loss = total_proceeds - total_cost

        # IRS rule: strictly more than 1 year (365 days) is Long-Term
        is_long_term = holding_days >= 365
        classification = "Long-Term Capital Gain" if is_long_term else "Short-Term Capital Gain"
        tax_treatment = (
            "Taxed at preferential capital gains rates (0%, 15%, or 20%)"
            if is_long_term
            else "Taxed as ordinary income at your marginal bracket (up to 37%)"
        )

        return {
            "asset_symbol": asset_symbol,
            "purchase_date": purchase_date_str,
            "sale_date": sale_date_str,
            "holding_period_days": holding_days,
            "cost_basis": round(total_cost, 2),
            "sale_proceeds": round(total_proceeds, 2),
            "gain_or_loss": round(gain_or_loss, 2),
            "classification": classification,
            "is_long_term": is_long_term,
            "tax_treatment": tax_treatment,
        }


class W8BenMonitor:
    """Tracks Form W-8BEN (Certificate of Foreign Status) 3-calendar-year expiration."""

    @staticmethod
    def check_status(
        signed_date_str: str = "2024-04-10",
        reference_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Form W-8BEN is valid from date signed through the end of the 3rd succeeding calendar year."""
        s_date = datetime.strptime(signed_date_str, "%Y-%m-%d").date()
        # IRS rule: expires Dec 31 of the 3rd full year following signature
        expiry_year = s_date.year + 3
        expiry_date = date(expiry_year, 12, 31)

        ref = reference_date or date.today()
        days_remaining = (expiry_date - ref).days

        if days_remaining <= 0:
            status = "EXPIRADO"
            severity = "danger"
            action = "Assinar imediatamente novo W-8BEN na corretora dos EUA para evitar retenção de 30% em dividendos."
        elif days_remaining <= 90:
            status = "RENOVAÇÃO PENDENTE (< 90 dias)"
            severity = "warning"
            action = f"Formulário W-8BEN vence em {days_remaining} dias. Renove online na Avenue/Nomad."
        else:
            status = "VÁLIDO E EM CONFORMIDADE"
            severity = "safe"
            action = f"Válido até 31/12/{expiry_year}. Alíquota de dividendos reduzida para acordo bilateral."

        return {
            "signed_date": signed_date_str,
            "expiration_date": expiry_date.isoformat(),
            "days_remaining": max(0, days_remaining),
            "status": status,
            "severity": severity,
            "action_required": action,
        }

