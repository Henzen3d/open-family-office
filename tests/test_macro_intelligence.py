"""Unit tests for the Macro Economic Intelligence and BCB Client."""
from decimal import Decimal
import os
import unittest

from src.intelligence.bcb_client import BCBClient
from src.intelligence.news_rss import EconomicNewsClient
from src.intelligence.macro_aggregator import MacroAggregator


class TestMacroIntelligence(unittest.TestCase):

    def test_bcb_client_fallback_resilience(self):
        client = BCBClient(timeout=1)
        # Even with an invalid host or offline, it must return valid fallback rates safely
        rate = client.fetch_indicator("SELIC")
        self.assertGreater(rate.value, Decimal("0.00"))
        self.assertEqual(rate.indicator_code, "SELIC")

    def test_news_client_returns_headlines(self):
        client = EconomicNewsClient(timeout=2)
        headlines = client.fetch_top_headlines(limit=3)
        self.assertTrue(len(headlines) > 0)
        self.assertIsNotNone(headlines[0].title)

    def test_macro_aggregator_caching(self):
        aggregator = MacroAggregator(cache_dir="tests/mock_cache")
        snapshot1 = aggregator.get_daily_snapshot(force_refresh=True)
        self.assertIsNotNone(snapshot1.snapshot_date)
        self.assertIn("SELIC", snapshot1.rates)

        # Second read should come from cache
        snapshot2 = aggregator.get_daily_snapshot(force_refresh=False)
        self.assertTrue(snapshot2.cached)
        self.assertEqual(snapshot1.rates["SELIC"].value, snapshot2.rates["SELIC"].value)

        # Cleanup mock cache
        mock_file = aggregator._get_cache_filepath(snapshot1.snapshot_date)
        if os.path.exists(mock_file):
            os.remove(mock_file)
        if os.path.exists("tests/mock_cache"):
            os.rmdir("tests/mock_cache")


if __name__ == "__main__":
    unittest.main()

