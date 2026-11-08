"""Public API Hub uniting Currency, Crypto, Business/CNPJ, and Banking Calendar."""
from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, List, Optional

from src.integrations.currency_client import CurrencyClient, FXQuote
from src.integrations.crypto_client import CryptoClient, CryptoPrice
from src.integrations.business_client import BusinessClient, CompanyProfile
from src.integrations.calendar_client import CalendarClient, PublicHoliday


@dataclass
class MarketOverview:
    """Consolidated market overview combining FX, Crypto, and Official Central Bank rates."""
    usd_brl: Optional[FXQuote]
    eur_brl: Optional[FXQuote]
    btc_brl: Optional[CryptoPrice]
    btc_usd: Optional[CryptoPrice]


class PublicApiHub:
    """Unified access gateway for curated free public APIs."""

    def __init__(self):
        self.currency = CurrencyClient()
        self.crypto = CryptoClient()
        self.business = BusinessClient()
        self.calendar = CalendarClient()

    def get_market_overview(self) -> MarketOverview:
        """Fetches a consolidated live market snapshot across FX and Crypto."""
        fx_quotes = self.currency.fetch_brl_quotes("USD-BRL,EUR-BRL")
        crypto_brl = self.crypto.fetch_crypto_brl()
        btc_usd = self.crypto.fetch_btc_usd()

        return MarketOverview(
            usd_brl=fx_quotes.get("USD-BRL"),
            eur_brl=fx_quotes.get("EUR-BRL"),
            btc_brl=crypto_brl.get("BTC"),
            btc_usd=btc_usd,
        )

    def verify_company(self, cnpj: str) -> Optional[CompanyProfile]:
        """Looks up company legal status via BrasilAPI."""
        return self.business.lookup_cnpj(cnpj)

    def get_upcoming_holidays(self, year: int, country_code: str = "BR") -> List[PublicHoliday]:
        """Returns official holidays for settlement calculations."""
        return self.calendar.fetch_holidays(year, country_code)

