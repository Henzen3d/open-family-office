"""Unit tests for the Public APIs Integrations Suite (Currency, Crypto, CNPJ, Calendar)."""
from datetime import date
from decimal import Decimal
import unittest

from src.integrations.currency_client import CurrencyClient
from src.integrations.crypto_client import CryptoClient
from src.integrations.business_client import BusinessClient, CompanyProfile
from src.integrations.calendar_client import CalendarClient
from src.integrations.hub import PublicApiHub


class TestPublicApiIntegrations(unittest.TestCase):

    def test_currency_conversion_same_currency(self):
        client = CurrencyClient()
        converted = client.convert_currency(Decimal("100.00"), "BRL", "BRL")
        self.assertEqual(converted, Decimal("100.00"))

    def test_currency_client_fallback_quotes(self):
        client = CurrencyClient(timeout=1)
        quotes = client.fetch_brl_quotes("USD-BRL")
        self.assertIn("USD-BRL", quotes)
        self.assertGreater(quotes["USD-BRL"].bid, Decimal("0.00"))

    def test_crypto_client_btc_spot(self):
        client = CryptoClient(timeout=2)
        price = client.fetch_btc_usd()
        self.assertEqual(price.symbol, "BTC")
        self.assertGreater(price.spot_price, Decimal("0.00"))

    def test_business_client_cnpj_sanitization(self):
        sanitized = BusinessClient.sanitize_cnpj("18.236.120/0001-58")
        self.assertEqual(sanitized, "18236120000158")

        with self.assertRaises(ValueError):
            # Invalid length
            BusinessClient().lookup_cnpj("123")

    def test_calendar_client_due_date_rollover_weekend(self):
        client = CalendarClient()
        # 2026-04-04 is a Saturday -> should roll to Monday 2026-04-06
        saturday = date(2026, 4, 4)
        rolled = client.roll_due_date_to_next_business_day(saturday, country_code="BR")
        self.assertEqual(rolled, date(2026, 4, 6))
        self.assertEqual(rolled.weekday(), 0)  # Monday

    def test_calendar_client_holiday_detection(self):
        client = CalendarClient()
        # 2026-01-01 is New Year's Day (National holiday)
        new_year = date(2026, 1, 1)
        self.assertTrue(client.is_holiday(new_year, country_code="BR"))
        self.assertFalse(client.is_business_day(new_year, country_code="BR"))

    def test_hub_market_overview(self):
        hub = PublicApiHub()
        overview = hub.get_market_overview()
        self.assertIsNotNone(overview.usd_brl)
        self.assertIsNotNone(overview.btc_usd)


if __name__ == "__main__":
    unittest.main()
