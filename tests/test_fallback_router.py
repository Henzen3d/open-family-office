"""Unit tests for the Multi-Provider Fallback Router."""
import unittest

from src.llm.fallback_router import LLMFallbackRouter, ProviderProfile
from src.llm.rate_limiter import ProviderLimits


class TestLLMFallbackRouter(unittest.TestCase):

    def setUp(self):
        self.router = LLMFallbackRouter()

    def test_default_profiles_order(self):
        # Gemini is Priority 1, Groq is Priority 2, OpenRouter is Priority 3, NVIDIA NIM is Priority 4
        self.assertEqual(self.router.profiles[0].name, "Google Gemini 2.0 Flash Free")
        self.assertEqual(self.router.profiles[1].name, "Groq Llama 3.3 70B Free")
        self.assertEqual(self.router.profiles[2].name, "OpenRouter Community Free")
        self.assertEqual(self.router.profiles[3].name, "NVIDIA NIM API")

    def test_selects_primary_when_available(self):
        now = 1000.0
        provider, wait_sec = self.router.select_provider(is_interactive=True, now=now)
        self.assertEqual(provider.name, "Google Gemini 2.0 Flash Free")
        self.assertEqual(wait_sec, 0.0)

    def test_switches_to_secondary_when_primary_in_cooldown(self):
        now = 1000.0
        # Gemini reports 429
        self.router.report_failure("Google Gemini 2.0 Flash Free", status_code=429, now=now)

        # Interactive call should immediately switch to Groq with 0 delay
        provider, wait_sec = self.router.select_provider(is_interactive=True, now=now + 1)
        self.assertEqual(provider.name, "Groq Llama 3.3 70B Free")
        self.assertEqual(wait_sec, 0.0)

    def test_switches_to_nvidia_nim_when_previous_busy(self):
        now = 1000.0
        # Put first 3 providers into cooldown
        self.router.report_failure("Google Gemini 2.0 Flash Free", now=now)
        self.router.report_failure("Groq Llama 3.3 70B Free", now=now)
        self.router.report_failure("OpenRouter Community Free", now=now)

        provider, wait_sec = self.router.select_provider(is_interactive=True, now=now + 1)
        self.assertEqual(provider.name, "NVIDIA NIM API")
        self.assertEqual(wait_sec, 0.0)


if __name__ == "__main__":
    unittest.main()

