"""Unit tests for the Sliding Window Rate Limiter."""
from decimal import Decimal
import time
import unittest

from src.llm.rate_limiter import ProviderLimits, SlidingWindowRateLimiter


class TestSlidingWindowRateLimiter(unittest.TestCase):

    def setUp(self):
        # Limit: 10 RPM, 1000 TPM, 100 RPD, threshold 80% (i.e. max 8 RPM, 800 TPM)
        self.limits = ProviderLimits(rpm_limit=10, tpm_limit=1000, rpd_limit=100, proactive_threshold_pct=0.80)
        self.limiter = SlidingWindowRateLimiter(self.limits)

    def test_allows_calls_under_threshold(self):
        now = 1000.0
        self.assertTrue(self.limiter.has_capacity(estimated_tokens=100, now=now))
        self.limiter.record_call(tokens_used=100, now=now)
        self.assertTrue(self.limiter.has_capacity(estimated_tokens=100, now=now))

    def test_proactively_blocks_when_reaching_80_percent_rpm(self):
        now = 1000.0
        # Record 8 calls (80% of 10 RPM)
        for i in range(8):
            self.limiter.record_call(tokens_used=50, now=now + i)

        # 9th call should be blocked proactively to avoid hitting 429
        self.assertFalse(self.limiter.has_capacity(estimated_tokens=50, now=now + 8))

    def test_cleans_rolling_window_after_60_seconds(self):
        now = 1000.0
        for i in range(8):
            self.limiter.record_call(tokens_used=50, now=now)

        self.assertFalse(self.limiter.has_capacity(now=now))

        # After 61 seconds, window should clear
        now_later = now + 61.0
        self.assertTrue(self.limiter.has_capacity(now=now_later))

    def test_cooldown_behavior(self):
        now = 1000.0
        self.assertFalse(self.limiter.is_in_cooldown(now=now))
        self.limiter.trigger_cooldown(seconds=60.0, now=now)
        self.assertTrue(self.limiter.is_in_cooldown(now=now + 10))
        self.assertFalse(self.limiter.has_capacity(now=now + 10))
        self.assertFalse(self.limiter.is_in_cooldown(now=now + 65))


if __name__ == "__main__":
    unittest.main()
