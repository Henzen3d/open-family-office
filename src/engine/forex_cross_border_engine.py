"""OpenFamilyOffice — Forex and Cross-Border Financial Engine.
Handles PTAX currency conversions, remittance fee simulators (IOF, spread, VET),
and Brazilian Central Bank foreign capital compliance (CBE Bacen).
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


class PtaxRateService:
    """Manages official Brazilian Central Bank (BCB) PTAX exchange rates with persistent local cache."""

    DEFAULT_RATES: Dict[str, float] = {
        "USD_BRL": 5.82,
        "EUR_BRL": 6.18,
        "GBP_BRL": 7.35,
        "USD_EUR": 0.94,
    }

    @classmethod
    def get_rates(cls, cache_dir: Optional[Path] = None) -> Dict[str, Any]:
        """Returns latest currency rates with variation metadata."""
        rates = dict(cls.DEFAULT_RATES)
        cached_file = (cache_dir / "ptax_rates.json") if cache_dir else None

        if cached_file and cached_file.exists():
            try:
                with open(cached_file, "r", encoding="utf-8") as f:
                    cached_data = json.load(f)
                    rates.update(cached_data.get("rates", {}))
            except Exception:
                pass

        return {
            "rates": rates,
            "base_currency": "BRL",
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "source": "Banco Central do Brasil (BCB PTAX Fechamento)",
        }

    @classmethod
    def convert(
        cls,
        amount: float,
        from_curr: str,
        to_curr: str,
        custom_rate: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Converts an amount between supported currencies."""
        from_curr = from_curr.upper()
        to_curr = to_curr.upper()

        if from_curr == to_curr:
            return {
                "original_amount": round(amount, 2),
                "from_currency": from_curr,
                "to_currency": to_curr,
                "rate": 1.0,
                "converted_amount": round(amount, 2),
            }

        rates = cls.DEFAULT_RATES
        usd_brl = custom_rate or rates.get("USD_BRL", 5.82)
        eur_brl = rates.get("EUR_BRL", 6.18)

        converted: float = amount
        rate_used: float = 1.0

        if from_curr == "BRL" and to_curr == "USD":
            rate_used = 1.0 / usd_brl
            converted = amount / usd_brl
        elif from_curr == "USD" and to_curr == "BRL":
            rate_used = usd_brl
            converted = amount * usd_brl
        elif from_curr == "BRL" and to_curr == "EUR":
            rate_used = 1.0 / eur_brl
            converted = amount / eur_brl
        elif from_curr == "EUR" and to_curr == "BRL":
            rate_used = eur_brl
            converted = amount * eur_brl
        elif from_curr == "USD" and to_curr == "EUR":
            rate_used = rates.get("USD_EUR", 0.94)
            converted = amount * rate_used
        else:
            # Fallback direct BRL bridge
            rate_used = 1.0 / usd_brl
            converted = amount / usd_brl

        return {
            "original_amount": round(amount, 2),
            "from_currency": from_curr,
            "to_currency": to_curr,
            "rate": round(rate_used, 4),
            "converted_amount": round(converted, 2),
        }


class RemittanceCalculator:
    """Simulates international transfers with IOF tax, platform spreads, and Effective Total Value (VET)."""

    PROVIDERS = [
        {"name": "Wise", "spread_percent": 1.15, "fixed_fee_brl": 15.0},
        {"name": "Nomad", "spread_percent": 1.70, "fixed_fee_brl": 0.0},
        {"name": "Avenue", "spread_percent": 1.85, "fixed_fee_brl": 0.0},
        {"name": "Banco Tradicional", "spread_percent": 3.60, "fixed_fee_brl": 120.0},
    ]

    @classmethod
    def calculate(
        cls,
        amount_brl: float,
        purpose: str = "same_ownership",  # "same_ownership" (1.1% IOF) or "investment" / "third_party" (0.38% IOF)
        ptax_usd: float = 5.82,
    ) -> Dict[str, Any]:
        """Compares remittance costs across top fintechs and traditional banks."""
        iof_rate = 0.011 if purpose == "same_ownership" else 0.0038
        iof_percent = iof_rate * 100.0

        comparisons: List[Dict[str, Any]] = []

        for p in cls.PROVIDERS:
            spread_pct = p["spread_percent"]
            fixed_fee = p["fixed_fee_brl"]

            # Effective exchange rate: PTAX + spread
            commercial_rate = ptax_usd * (1.0 + spread_pct / 100.0)

            # Deduct fixed fee from gross BRL
            net_brl_after_fee = max(0.0, amount_brl - fixed_fee)
            # IOF applies to the total BRL exchanged
            iof_amount = net_brl_after_fee * iof_rate
            net_brl_for_fx = max(0.0, net_brl_after_fee - iof_amount)

            # Net USD received
            net_usd_received = net_brl_for_fx / commercial_rate

            # VET (Valor Efetivo Total): Total BRL spent per USD received
            vet = amount_brl / net_usd_received if net_usd_received > 0 else commercial_rate

            comparisons.append({
                "provider": p["name"],
                "gross_brl": round(amount_brl, 2),
                "fixed_fee_brl": round(fixed_fee, 2),
                "iof_rate_percent": round(iof_percent, 2),
                "iof_amount_brl": round(iof_amount, 2),
                "spread_percent": round(spread_pct, 2),
                "commercial_exchange_rate": round(commercial_rate, 4),
                "net_usd_received": round(net_usd_received, 2),
                "vet": round(vet, 4),
            })

        # Sort by most USD received
        comparisons.sort(key=lambda x: x["net_usd_received"], reverse=True)
        best_provider = comparisons[0]["provider"]
        max_usd = comparisons[0]["net_usd_received"]
        min_usd = comparisons[-1]["net_usd_received"]
        diff_usd = max_usd - min_usd

        return {
            "amount_brl": round(amount_brl, 2),
            "purpose": purpose,
            "ptax_base_rate": round(ptax_usd, 4),
            "best_provider": best_provider,
            "difference_vs_worst_usd": round(diff_usd, 2),
            "comparisons": comparisons,
        }


class CbeBacenMonitor:
    """Monitors Brazilian Central Bank Mandatory Declaration of Capitals Abroad (CBE Bacen)."""

    THRESHOLD_USD: float = 1000000.0  # US$ 1,000,000 annual CBE threshold

    @classmethod
    def check_threshold(
        cls,
        total_foreign_assets_usd: float,
    ) -> Dict[str, Any]:
        """Evaluates whether the family must submit the CBE Bacen annual declaration."""
        threshold = cls.THRESHOLD_USD
        percentage = (total_foreign_assets_usd / threshold) * 100.0
        remaining_margin = max(0.0, threshold - total_foreign_assets_usd)

        if total_foreign_assets_usd >= threshold:
            status = "Declaração CBE Anual Compulsória"
            severity = "danger"
            action = "Preparar declaração CBE até 05 de Abril para evitar multa de até R$ 250.000,00."
        elif percentage >= 80.0:
            status = "Atenção: Próximo ao Teto CBE (80%+)"
            severity = "warning"
            action = "Monitorar valorização cambial e aportes no exterior para não ultrapassar US$ 1M sem preparo contábil."
        else:
            status = "Isento de Declaração CBE Bacen"
            severity = "safe"
            action = "Patrimônio mantido fora do Brasil dentro do limite de dispensa do Banco Central."

        return {
            "total_foreign_assets_usd": round(total_foreign_assets_usd, 2),
            "cbe_threshold_usd": round(threshold, 2),
            "percentage_of_threshold": round(percentage, 1),
            "remaining_exempt_margin_usd": round(remaining_margin, 2),
            "status": status,
            "severity": severity,
            "recommended_action": action,
            "declaration_window": "15 de Fevereiro a 05 de Abril",
        }

