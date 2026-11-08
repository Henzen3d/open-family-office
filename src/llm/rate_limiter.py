"""Sliding-Window Rate Limiter for RPM, TPM, and RPD."""
from dataclasses import dataclass, field
from datetime import datetime, date
import time
from typing import List, Tuple


@dataclass
class ProviderLimits:
    """Rate limit configuration for an LLM provider."""
    rpm_limit: int  # Requests per minute
    tpm_limit: int  # Tokens per minute
    rpd_limit: int  # Requests per day
    proactive_threshold_pct: float = 0.80  # Switch before hitting 100%


class SlidingWindowRateLimiter:
    """Maintains a rolling sliding window to calculate exact RPM, TPM, and RPD usage."""

    def __init__(self, limits: ProviderLimits):
        self.limits = limits
        self.request_timestamps: List[float] = []
        self.token_records: List[Tuple[float, int]] = []
        self.today_date: date = date.today()
        self.daily_requests_count: int = 0
        self.cooldown_until: float = 0.0

    def _clean_old_records(self, now: float):
        """Removes records older than 60 seconds and resets daily counter at midnight."""
        cutoff_60s = now - 60.0
        self.request_timestamps = [t for t in self.request_timestamps if t > cutoff_60s]
        self.token_records = [rec for rec in self.token_records if rec[0] > cutoff_60s]

        # Reset daily count if date has rolled over
        today = date.today()
        if today != self.today_date:
            self.today_date = today
            self.daily_requests_count = 0

    def is_in_cooldown(self, now: float = None) -> bool:
        """Checks if provider is currently cooling down due to a 429/5xx error."""
        now = now or time.time()
        return now < self.cooldown_until

    def trigger_cooldown(self, seconds: float = 60.0, now: float = None):
        """Places provider into cooldown for the specified duration."""
        now = now or time.time()
        self.cooldown_until = now + seconds

    def current_usage(self, now: float = None) -> Tuple[int, int, int]:
        """Returns (rolling_rpm, rolling_tpm, daily_rpd)."""
        now = now or time.time()
        self._clean_old_records(now)
        rpm = len(self.request_timestamps)
        tpm = sum(rec[1] for rec in self.token_records)
        return rpm, tpm, self.daily_requests_count

    def has_capacity(self, estimated_tokens: int = 500, now: float = None) -> bool:
        """Returns True if the provider is under the proactive threshold for RPM, TPM, and RPD."""
        now = now or time.time()
        if self.is_in_cooldown(now):
            return False

        rpm, tpm, rpd = self.current_usage(now)

        max_rpm = int(self.limits.rpm_limit * self.limits.proactive_threshold_pct)
        max_tpm = int(self.limits.tpm_limit * self.limits.proactive_threshold_pct)
        max_rpd = int(self.limits.rpd_limit * self.limits.proactive_threshold_pct)

        if rpm >= max_rpm:
            return False
        if (tpm + estimated_tokens) >= max_tpm:
            return False
        if rpd >= max_rpd:
            return False

        return True

    def calculate_wait_seconds(self, now: float = None) -> float:
        """Calculates seconds to wait until the 60-second rolling window frees up capacity."""
        now = now or time.time()
        self._clean_old_records(now)

        if self.is_in_cooldown(now):
            return max(0.0, self.cooldown_until - now)

        if not self.request_timestamps:
            return 0.0

        oldest = self.request_timestamps[0]
        wait_time = 60.0 - (now - oldest) + 0.5
        return max(0.0, wait_time)

    def record_call(self, tokens_used: int = 500, now: float = None):
        """Records an executed LLM call."""
        now = now or time.time()
        self._clean_old_records(now)
        self.request_timestamps.append(now)
        self.token_records.append((now, tokens_used))
        self.daily_requests_count += 1

