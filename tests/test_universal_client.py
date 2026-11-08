"""Unit tests for the Universal LLM Client formatting and parsing."""
import json
import unittest

from src.llm.client import UniversalLLMClient, LLMResponse
from src.llm.config_manager import CustomProviderConfig


class TestUniversalLLMClient(unittest.TestCase):

    def setUp(self):
        self.client = UniversalLLMClient()

    def test_format_openai_request(self):
        cfg = CustomProviderConfig(
            id="openai-test",
            name="OpenAI Test",
            protocol="openai",
            base_url="https://api.groq.com/openai/v1",
            api_key="gsk-test",
            model="llama-3.3-70b",
        )
        url, headers, payload = self.client.format_request(
            config=cfg,
            user_prompt="Hello, world!",
            system_prompt="You are helpful.",
        )
        self.assertEqual(url, "https://api.groq.com/openai/v1/chat/completions")
        self.assertEqual(headers["Authorization"], "Bearer gsk-test")
        data = json.loads(payload.decode("utf-8"))
        self.assertEqual(len(data["messages"]), 2)
        self.assertEqual(data["messages"][0]["role"], "system")
        self.assertEqual(data["messages"][1]["role"], "user")

    def test_format_anthropic_request(self):
        cfg = CustomProviderConfig(
            id="anthropic-test",
            name="Anthropic Test",
            protocol="anthropic",
            base_url="https://api.anthropic.com/v1",
            api_key="sk-ant-test",
            model="claude-3-5-sonnet-20241022",
            custom_headers={"anthropic-version": "2023-06-01"},
        )
        url, headers, payload = self.client.format_request(
            config=cfg,
            user_prompt="Hello Anthropic!",
            system_prompt="Be concise.",
        )
        self.assertEqual(url, "https://api.anthropic.com/v1/messages")
        self.assertEqual(headers["x-api-key"], "sk-ant-test")
        self.assertEqual(headers["anthropic-version"], "2023-06-01")
        data = json.loads(payload.decode("utf-8"))
        self.assertEqual(data["system"], "Be concise.")
        self.assertEqual(data["messages"][0]["content"], "Hello Anthropic!")

    def test_parse_openai_response(self):
        cfg = CustomProviderConfig(
            id="test-1", name="Test", protocol="openai", base_url="http://x", api_key="k", model="m"
        )
        raw = {
            "choices": [{"message": {"content": "Sample output"}}],
            "usage": {"total_tokens": 150},
        }
        resp = self.client.parse_response(cfg, raw)
        self.assertEqual(resp.content, "Sample output")
        self.assertEqual(resp.tokens_used, 150)

    def test_parse_anthropic_response(self):
        cfg = CustomProviderConfig(
            id="test-2", name="Test", protocol="anthropic", base_url="http://x", api_key="k", model="m"
        )
        raw = {
            "content": [{"type": "text", "text": "Anthropic output"}],
            "usage": {"input_tokens": 20, "output_tokens": 80},
        }
        resp = self.client.parse_response(cfg, raw)
        self.assertEqual(resp.content, "Anthropic output")
        self.assertEqual(resp.tokens_used, 100)


if __name__ == "__main__":
    unittest.main()

