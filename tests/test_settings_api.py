"""Unit tests for Settings and LLM Provider configuration logic and API."""
import os
import json
import unittest

from src.llm.config_manager import CustomProviderConfig, ProviderConfigManager
from src.llm.importer import EnvImporter
from src.llm.rate_limiter import ProviderLimits


def mask_secret(secret: str) -> str:
    """Helper duplicate matching api.py for standalone testing."""
    if not secret:
        return ""
    if secret.startswith("${") and secret.endswith("}"):
        return secret
    if len(secret) <= 8:
        return "****"
    return f"{secret[:4]}...{secret[-4:]}"


class TestSettingsAndProviders(unittest.TestCase):

    def setUp(self):
        self.test_json = "tests/test_providers_temp.json"
        with open(self.test_json, "w", encoding="utf-8") as f:
            f.write("[]")
        self.mgr = ProviderConfigManager(config_path=self.test_json, example_path="config/providers.example.json")

    def tearDown(self):
        if os.path.exists(self.test_json):
            os.remove(self.test_json)

    def test_mask_secret(self):
        self.assertEqual(mask_secret(""), "")
        self.assertEqual(mask_secret("123"), "****")
        self.assertEqual(mask_secret("12345678"), "****")
        self.assertEqual(mask_secret("AIzaSyFakeKey123456"), "AIza...3456")
        self.assertEqual(mask_secret("${ANTHROPIC_KEY}"), "${ANTHROPIC_KEY}")

    def test_provider_crud_and_reorder(self):
        cfg1 = CustomProviderConfig(
            id="prov-1",
            name="Provider One",
            protocol="openai",
            base_url="https://api.one.com/v1",
            api_key="sk-1111222233334444",
            model="model-1",
            priority=1,
            enabled=True,
        )
        cfg2 = CustomProviderConfig(
            id="prov-2",
            name="Provider Two",
            protocol="anthropic",
            base_url="https://api.two.com/v1",
            api_key="sk-ant-999988887777",
            model="claude-3-5-sonnet",
            priority=2,
            enabled=True,
        )
        self.mgr.add_provider(cfg1)
        self.mgr.add_provider(cfg2)

        # List
        provs = self.mgr.list_providers()
        self.assertEqual(len(provs), 2)
        self.assertEqual(provs[0].id, "prov-1")

        # Toggle
        self.mgr.toggle_provider("prov-1")
        self.assertFalse(self.mgr.providers["prov-1"].enabled)
        self.mgr.toggle_provider("prov-1", enabled=True)
        self.assertTrue(self.mgr.providers["prov-1"].enabled)

        # Reorder
        self.mgr.reorder_providers(["prov-2", "prov-1"])
        reordered = self.mgr.list_providers()
        self.assertEqual(reordered[0].id, "prov-2")
        self.assertEqual(reordered[1].id, "prov-1")

        # Delete
        self.assertTrue(self.mgr.remove_provider("prov-1"))
        self.assertNotIn("prov-1", self.mgr.providers)

    def test_nexus_env_import_content(self):
        raw_env = """
        # NexusLocal Environment Extract
        GEMINI_API_KEY=AIzaSyTest1234567890abcdef
        GROQ_API_KEY=gsk_test1234567890abcdef
        ANTHROPIC_BASE_URL=https://api.customanthropic.com/v1
        ANTHROPIC_AUTH_TOKEN=sk-ant-customtest123456
        """
        importer = EnvImporter()
        imported = importer.import_from_env_content(raw_env, self.mgr)
        imported_ids = [p[0] for p in imported]
        self.assertIn("gemini-free", imported_ids)
        self.assertIn("groq-free", imported_ids)
        self.assertIn("anthropic-custom", imported_ids)

        anthropic_prov = self.mgr.providers["anthropic-custom"]
        self.assertEqual(anthropic_prov.protocol, "anthropic")
        self.assertEqual(anthropic_prov.base_url, "https://api.customanthropic.com/v1")
        self.assertEqual(anthropic_prov.api_key, "sk-ant-customtest123456")
