"""Multi-Provider LLM Fallback Router with Proactive Rate Limit Avoidance."""
from dataclasses import dataclass, field
import time
from typing import Dict, List, Optional, Tuple

from src.llm.rate_limiter import ProviderLimits, SlidingWindowRateLimiter
from src.llm.config_manager import CustomProviderConfig, ProviderConfigManager


@dataclass
class ProviderProfile:
    """Configured LLM provider profile."""
    name: str
    model_name: str
    provider_type: str  # "GEMINI_FREE", "GROQ_FREE", "OPENROUTER_FREE", "NVIDIA_NIM", "CUSTOM"
    priority: int       # 1 is highest priority
    limits: ProviderLimits
    config: Optional[CustomProviderConfig] = None
    rate_limiter: SlidingWindowRateLimiter = field(init=False)

    def __post_init__(self):
        self.rate_limiter = SlidingWindowRateLimiter(self.limits)


class LLMFallbackRouter:
    """Intelligently routes requests across free-tier LLM providers, avoiding rate limits and switching seamlessly."""

    def __init__(self, profiles: Optional[List[ProviderProfile]] = None):
        self.profiles: List[ProviderProfile] = profiles or self._build_default_profiles()
        # Sort by priority ascending (1 = primary)
        self.profiles.sort(key=lambda p: p.priority)

    @classmethod
    def from_config_manager(cls, manager: ProviderConfigManager) -> "LLMFallbackRouter":
        """Builds a router populated with dynamic custom providers from the config manager."""
        custom_configs = manager.list_providers(enabled_only=True)
        if not custom_configs:
            return cls()

        profiles = []
        for c in custom_configs:
            profiles.append(
                ProviderProfile(
                    name=c.name,
                    model_name=c.model,
                    provider_type=c.protocol.upper(),
                    priority=c.priority,
                    limits=c.limits,
                    config=c,
                )
            )
        return cls(profiles)

    def _build_default_profiles(self) -> List[ProviderProfile]:
        """Builds recommended default free tier profiles."""
        return [
            ProviderProfile(
                name="Google Gemini 2.0 Flash Free",
                model_name="gemini-2.0-flash",
                provider_type="GEMINI_FREE",
                priority=1,
                limits=ProviderLimits(rpm_limit=15, tpm_limit=1000000, rpd_limit=1500, proactive_threshold_pct=0.80),
            ),
            ProviderProfile(
                name="Groq Llama 3.3 70B Free",
                model_name="llama-3.3-70b-versatile",
                provider_type="GROQ_FREE",
                priority=2,
                limits=ProviderLimits(rpm_limit=30, tpm_limit=30000, rpd_limit=14400, proactive_threshold_pct=0.80),
            ),
            ProviderProfile(
                name="OpenRouter Community Free",
                model_name="meta-llama/llama-3.3-70b-instruct:free",
                provider_type="OPENROUTER_FREE",
                priority=3,
                limits=ProviderLimits(rpm_limit=20, tpm_limit=20000, rpd_limit=1000, proactive_threshold_pct=0.80),
            ),
            ProviderProfile(
                name="NVIDIA NIM API",
                model_name="meta/llama-3.3-70b-instruct",
                provider_type="NVIDIA_NIM",
                priority=4,
                limits=ProviderLimits(rpm_limit=40, tpm_limit=60000, rpd_limit=5000, proactive_threshold_pct=0.80),
            ),
        ]

    def select_provider(
        self,
        is_interactive: bool = True,
        estimated_tokens: int = 500,
        now: float = None,
    ) -> Tuple[ProviderProfile, float]:
        """Selects the best available provider.
        Returns (selected_provider, wait_seconds).
        - If interactive: never waits, immediately switches to the next healthy provider with zero delay.
        - If background: if all cloud providers are busy, calculates the optimal wait delay.
        """
        now = now or time.time()

        # Step 1: Check for any provider with capacity right now
        for profile in self.profiles:
            if profile.rate_limiter.has_capacity(estimated_tokens, now=now):
                return profile, 0.0

        # Step 2: If all providers are in cooldown or at limit, select the one with minimal wait time
        best_profile = self.profiles[0]
        min_wait = best_profile.rate_limiter.calculate_wait_seconds(now=now)

        for profile in self.profiles[1:]:
            wait = profile.rate_limiter.calculate_wait_seconds(now=now)
            if wait < min_wait:
                min_wait = wait
                best_profile = profile

        return best_profile, (0.0 if is_interactive else min_wait)

    def record_success(self, provider_name: str, tokens_used: int = 500, now: float = None):
        """Records a successful LLM call on the specified provider."""
        for p in self.profiles:
            if p.name == provider_name:
                p.rate_limiter.record_call(tokens_used, now=now)
                break

    def report_failure(self, provider_name: str, status_code: int = 429, cooldown_seconds: float = 60.0, now: float = None):
        """Puts a provider into cooldown when an error (such as 429) occurs."""
        for p in self.profiles:
            if p.name == provider_name:
                p.rate_limiter.trigger_cooldown(cooldown_seconds, now=now)
                break

