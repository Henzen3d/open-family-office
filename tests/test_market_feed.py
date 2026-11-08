"""Unit tests for MarketFeedService with caching and public APIs."""
import os
import unittest
from src.intelligence.market_feed import MarketFeedService


class TestMarketFeedService(unittest.TestCase):

    def setUp(self):
        self.test_cache = "tests/test_market_cache_temp.json"
        if os.path.exists(self.test_cache):
            os.remove(self.test_cache)
        self.service = MarketFeedService(cache_file=self.test_cache)

    def tearDown(self):
        if os.path.exists(self.test_cache):
            os.remove(self.test_cache)

    def test_get_market_overview(self):
        # 1. Fetch live snapshot
        data = self.service.get_market_overview(force_refresh=True)
        self.assertIn("rates", data)
        self.assertIn("currencies", data)
        self.assertIn("crypto", data)
        self.assertFalse(data["cached"])

        # Check Selic and PTAX existence
        self.assertIn("SELIC", data["rates"])
        self.assertGreater(data["rates"]["SELIC"]["value"], 0)

        # Check FX
        self.assertTrue(len(data["currencies"]) > 0)
        self.assertIn("USD-BRL", data["currencies"])

        # 2. Second fetch within TTL must hit cache
        cached_data = self.service.get_market_overview(force_refresh=False)
        self.assertTrue(cached_data["cached"])
        self.assertEqual(cached_data["rates"]["SELIC"]["value"], data["rates"]["SELIC"]["value"])

