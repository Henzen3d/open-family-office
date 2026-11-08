"""Unit tests for SmartRouter (Auto Roteamento Inteligente)."""
import os
import unittest
from unittest.mock import MagicMock, patch

from src.llm.smart_router import IntentDecision, IntentKey, SmartRouter
from src.llm.client import LLMResponse
from src.llm.config_manager import CustomProviderConfig, ProviderConfigManager
from src.security.sanitizer import PIISanitizer


class TestSmartRouterClassification(unittest.TestCase):
    def setUp(self):
        self.router = SmartRouter()

    def test_trivial_queries(self):
        decision = self.router.classify_intent("oi, tudo bem?")
        self.assertEqual(decision.intent, IntentKey.TRIVIAL_QUICK)

        decision_model = self.router.classify_intent("qual o seu modelo?")
        self.assertEqual(decision_model.intent, IntentKey.TRIVIAL_QUICK)

    def test_financial_ops_queries(self):
        decision = self.router.classify_intent("qual o limite de faturamento do MEI da Fix Serviços?")
        self.assertEqual(decision.intent, IntentKey.FINANCIAL_OPS)
        self.assertIn("financial_ops", decision.matched_signals)

        decision_das = self.router.classify_intent("como emitir a guia DAS da Facilita Vistorias?")
        self.assertEqual(decision_das.intent, IntentKey.FINANCIAL_OPS)

        decision_caixa = self.router.classify_intent("Resumo de Caixa")
        self.assertEqual(decision_caixa.intent, IntentKey.FINANCIAL_OPS)

        decision_status = self.router.classify_intent("Status das Contas")
        self.assertEqual(decision_status.intent, IntentKey.FINANCIAL_OPS)

    def test_investment_macro_queries(self):
        decision = self.router.classify_intent("qual a melhor opção de investimento hoje com a Selic atual?")
        self.assertEqual(decision.intent, IntentKey.INVESTMENT_MACRO)
        self.assertIn("investment_macro", decision.matched_signals)

        decision_tesouro = self.router.classify_intent("onde aplicar caixa em renda fixa ou tesouro selic?")
        self.assertEqual(decision_tesouro.intent, IntentKey.INVESTMENT_MACRO)

    def test_deep_reasoning_queries(self):
        decision = self.router.classify_intent("qual o melhor planejamento para transição de MEI para ME?")
        self.assertEqual(decision.intent, IntentKey.DEEP_REASONING)


class TestSmartRouterExecution(unittest.TestCase):
    def setUp(self):
        self.mock_config_mgr = MagicMock(spec=ProviderConfigManager)
        self.mock_provider = CustomProviderConfig(
            id="mock-groq",
            name="Mock Groq",
            protocol="openai",
            model="qwen/qwen3.8-27b",
            base_url="https://api.groq.com/openai/v1",
            api_key="mock_key",
            enabled=True,
            priority=1,
        )
        self.mock_config_mgr.list_providers.return_value = [self.mock_provider]
        self.sanitizer = PIISanitizer()
        self.router = SmartRouter(
            config_manager=self.mock_config_mgr,
            sanitizer=self.sanitizer,
        )

    def test_trivial_model_query_returns_fast_response(self):
        result = self.router.execute_chat("qual o seu modelo?")
        self.assertIn("qwen/qwen3.8-27b", result["reply"])
        self.assertEqual(result["model"], "qwen/qwen3.8-27b")
        self.assertEqual(result["provider"], "Mock Groq")
        self.assertTrue(result["sanitized"])

    @patch("src.llm.client.UniversalLLMClient.generate")
    def test_successful_llm_execution_with_pii_sanitization(self, mock_generate):
        mock_generate.return_value = LLMResponse(
            content="Posição do titular [CPF_MASK_1] regular. Teto sob controle.",
            tokens_used=42,
            model_name="qwen/qwen3.8-27b",
            provider_id="mock-groq",
            raw_response={},
        )

        user_input = "O titular com CPF 529.982.247-25 está com o MEI em dia?"
        result = self.router.execute_chat(user_input)

        # Ensure client received sanitized text, not raw CPF
        call_args = mock_generate.call_args
        self.assertNotIn("529.982.247-25", call_args.kwargs["user_prompt"])
        self.assertIn("[CPF_MASK_1]", call_args.kwargs["user_prompt"])

        # Ensure returned reply detokenized the CPF back for the user
        self.assertIn("529.982.247-25", result["reply"])
        self.assertEqual(result["model"], "qwen/qwen3.8-27b")
        self.assertEqual(result["provider"], "Mock Groq")

    @patch("src.llm.client.UniversalLLMClient.generate")
    def test_fallback_when_providers_fail(self, mock_generate):
        mock_generate.side_effect = Exception("Rate limit exceeded 429")

        result = self.router.execute_chat("qual a melhor opção de investimento hoje?")
        self.assertEqual(result["provider"], "Offline Heuristic Fallback")
        self.assertIn("renda fixa", result["reply"].lower())
        self.assertIn("selic", result["reply"].lower())

    def test_system_prompt_includes_cash_and_indices(self):
        prompt = self.router.build_system_prompt(IntentKey.FINANCIAL_OPS)
        self.assertIn("Fix Serviços MEI", prompt)
        self.assertIn("Facilita Vistorias MEI", prompt)
        self.assertIn("Household PF", prompt)
        self.assertIn("B3 Ibovespa", prompt)
        self.assertIn("S&P 500", prompt)
        self.assertIn("Nasdaq", prompt)

    @patch("src.llm.client.UniversalLLMClient.generate")
    def test_financial_ops_fallback_includes_cash(self, mock_generate):
        mock_generate.side_effect = Exception("Service unavailable 503")

        result = self.router.execute_chat("Conciliação fiscal de despesas MEI")
        self.assertEqual(result["provider"], "Offline Heuristic Fallback")
        self.assertIn("Fix Serviços", result["reply"])
        self.assertIn("Facilita Vistorias", result["reply"])
        self.assertIn("47.730,00", result["reply"])


if __name__ == "__main__":
    unittest.main()
