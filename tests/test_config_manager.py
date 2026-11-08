"""Unit tests for the Provider Configuration Manager."""
import os
import unittest

from src.llm.config_manager import CustomProviderConfig, ProviderConfigManager
from src.llm.rate_limiter import ProviderLimits


class TestProviderConfigManager(unittest.TestCase):

    def setUp(self):
        self.test_config_path = "tests/mock_providers.json"
        self.test_example_path = "config/providers.example.json"
        if os.path.exists(self.test_config_path):
            os.remove(self.test_config_path)

    def tearDown(self):
        if os.path.exists(self.test_config_path):
            os.remove(self.test_config_path)

    def test_loads_example_when_config_not_present(self):
        manager = ProviderConfigManager(config_path=self.test_config_path, example_path=self.test_example_path)
        providers = manager.list_providers()
        self.assertGreaterEqual(len(providers), 3)

    def test_add_and_remove_anthropic_compatible_provider(self):
        manager = ProviderConfigManager(config_path=self.test_config_path, example_path=self.test_example_path)
        cfg = CustomProviderConfig(
            id="my-anthropic-gateway",
            name="Custom Claude Gateway",
            protocol="anthropic",
            base_url="https://gateway.example.com/v1",
            api_key="sk-ant-test",
            model="claude-3-5-sonnet",
            priority=1,
            limits=ProviderLimits(rpm_limit=50, tpm_limit=40000, rpd_limit=2000),
            custom_headers={"anthropic-version": "2023-06-01"},
        )
        manager.add_provider(cfg)

        self.assertIn("my-anthropic-gateway", manager.providers)
        self.assertTrue(os.path.exists(self.test_config_path))

        # Check resolution
        retrieved = manager.providers["my-anthropic-gateway"]
        self.assertEqual(retrieved.protocol, "anthropic")
        self.assertEqual(retrieved.resolve_api_key(), "sk-ant-test")

        # Test remove
        self.assertTrue(manager.remove_provider("my-anthropic-gateway"))
        self.assertNotIn("my-anthropic-gateway", manager.providers)


if __name__ == "__main__":
    unittest.main()

