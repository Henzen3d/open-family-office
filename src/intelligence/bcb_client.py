"""Banco Central do Brasil (BCB) SGS Public API Client."""
from decimal import Decimal
import json
from typing import Dict, Optional
import urllib.request

from src.models.reports import EconomicRate


class BCBClient:
    """Fetches official macroeconomic indicators from the Central Bank of Brazil SGS API (100% free, public, no API keys)."""

    BASE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie}/dados/ultimos/1?formato=json"

    INDICATOR_SERIES = {
        "SELIC": (432, "Taxa Selic Meta"),
        "DOLAR_PTAX": (1, "Dolar Comercial PTAX (Venda)"),
        "IPCA_12M": (13522, "IPCA Acumulado 12 Meses"),
    }

    # Safe fallback defaults if network is offline
    FALLBACK_RATES = {
        "SELIC": Decimal("13.75"),
        "DOLAR_PTAX": Decimal("5.50"),
        "IPCA_12M": Decimal("4.50"),
    }

    def __init__(self, timeout: int = 5):
        self.timeout = timeout

    def fetch_indicator(self, indicator_code: str) -> EconomicRate:
        """Fetches the latest value for a specific BCB series."""
        if indicator_code not in self.INDICATOR_SERIES:
            raise ValueError(f"Unknown indicator code: {indicator_code}")

        serie_id, name = self.INDICATOR_SERIES[indicator_code]
        url = self.BASE_URL.format(serie=serie_id)

        try:
            req = urllib.request.Request(url, headers={"User-Agent": "OpenFamilyOffice/1.0"})
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                payload = json.loads(response.read().decode("utf-8"))
                if payload and isinstance(payload, list):
                    latest = payload[0]
                    val = Decimal(str(latest["valor"]).replace(",", "."))
                    ref_date = str(latest["data"])
                    return EconomicRate(
                        indicator_code=indicator_code,
                        name=name,
                        value=val,
                        reference_date=ref_date,
                        source="Banco Central do Brasil (SGS)",
                    )
        except Exception:
            # Return resilient fallback on network error or offline mode
            pass

        return EconomicRate(
            indicator_code=indicator_code,
            name=name,
            value=self.FALLBACK_RATES[indicator_code],
            reference_date="OFFLINE_FALLBACK",
            source="Banco Central do Brasil (Fallback)",
        )

    def fetch_all_rates(self) -> Dict[str, EconomicRate]:
        """Fetches Selic, Dolar, and IPCA."""
        rates = {}
        for code in self.INDICATOR_SERIES:
            rates[code] = self.fetch_indicator(code)
        return rates

