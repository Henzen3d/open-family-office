"""Unit tests for the EnvImporter."""
import os
import unittest

from src.llm.importer import EnvImporter
from src.llm.config_manager import ProviderConfigManager


class TestEnvImporter(unittest.TestCase):

    def setUp(self):
        self.mock_env = "tests/mock.env"
        self.mock_config = "tests/mock_imported_providers.json"
        with open(self.mock_env, "w", encoding="utf-8") as f:
            f.write("GEMINI_API_KEY=test-gemini-key\n")
            f.write("GROQ_API_KEY=test-groq-key\n")
            f.write("DEEPSEEK_API_KEY=test-deepseek-key\n")
            f.write("ANTHROPIC_API_KEY=test-anthropic-key\n")
            f.write("OLLAMA_BASE_URL=http://localhost:11434\n")

    def tearDown(self):
        for f in [self.mock_env, self.mock_config]:
            if os.path.exists(f):
                os.remove(f)

    def test_imports_known_keys(self):
        manager = ProviderConfigManager(config_path=self.mock_config)
        importer = EnvImporter()
        imported = importer.import_from_env_file(self.mock_env, manager)

        self.assertEqual(len(imported), 5)
        imported_ids = [pid for pid, _ in imported]
        self.assertIn("gemini-free", imported_ids)
        self.assertIn("groq-free", imported_ids)
        self.assertIn("deepseek-api", imported_ids)
        self.assertIn("anthropic-claude", imported_ids)
        self.assertIn("local-ollama", imported_ids)

        # Verify Anthropic protocol was correctly mapped
        claude = manager.providers["anthropic-claude"]
        self.assertEqual(claude.protocol, "anthropic")
        self.assertEqual(claude.api_key, "test-anthropic-key")


if __name__ == "__main__":
    unittest.main()
