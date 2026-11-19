"""Comprehensive Verification Tests for Tasks T03, T04, T05, and T07.

Covers:
- T03: Data minimization in prompts, egress security guard, read-only Consolidado scope.
- T04: Conversation continuity, session store, entity & period resolution, tone standardization.
- T05: Typed tool calling schemas, execution dispatcher, idempotent confirmation card.
- T07: SSRF prevention, URL validation, outbound search scrub, official BCB data.
"""
from decimal import Decimal
import json
import unittest
from unittest.mock import MagicMock, patch

from src.security.sanitizer import PIISanitizer, SecurityEgressException
from src.security.web_guard import validate_url_safety, SecuritySSRFException
from src.intelligence.web_research import WebResearchService, SearchCitation
from src.intelligence.conversation_store import ConversationStore, ConversationSession
from src.intelligence.assistant_tools import (
    ASSISTANT_TOOL_SCHEMAS,
    execute_tool_call,
)
from src.llm.client import UniversalLLMClient, LLMResponse
from src.llm.config_manager import CustomProviderConfig
from src.llm.smart_router import SmartRouter, IntentKey


class TestT03DataMinimizationAndSecurity(unittest.TestCase):
    def setUp(self):
        self.sanitizer = PIISanitizer()
        self.router = SmartRouter(sanitizer=self.sanitizer)

    def test_system_prompt_does_not_contain_full_receipts_or_transactions_dump(self):
        """Prompt must not automatically inject raw ledger transactions or receipts."""
        prompt = self.router.build_system_prompt(IntentKey.GENERAL_CHAT)
        self.assertNotIn("Últimos Comprovantes Enviados", prompt)
        self.assertNotIn("Últimos Lançamentos Registrados no Livro-Razão", prompt)
        # Governed entities and indices must still be present
        self.assertIn("Fix Serviços MEI", prompt)
        self.assertIn("Facilita Vistorias MEI", prompt)
        self.assertIn("Household PF", prompt)
        self.assertIn("B3 Ibovespa", prompt)
        self.assertIn("S&P 500", prompt)

    def test_outbound_pii_sanitization_and_egress_guard(self):
        """PII must be tokenized and verified before leaving the server."""
        raw_msg = "Contrato de Osmar Henzen CPF 529.982.247-25 na Fix Serviços MEI"
        sanitized, tokens = self.sanitizer.sanitize(raw_msg)
        self.assertNotIn("529.982.247-25", sanitized)
        self.assertNotIn("Osmar Henzen", sanitized)
        self.assertIn("[CPF_MASK_1]", sanitized)
        self.assertTrue(self.sanitizer.verify_egress_safety(sanitized))

        # Egress guard raises if unmasked CPF or trade name is present
        with self.assertRaises(SecurityEgressException):
            self.sanitizer.verify_egress_safety("Chave Pix com CPF 529.982.247-25")

        with self.assertRaises(SecurityEgressException):
            self.sanitizer.verify_egress_safety("Empresa Fix Serviços Elétricos")

    def test_search_query_scrub_removes_private_entities_and_balances(self):
        """Outbound web search must scrub all private entity names and financial values."""
        private_query = "Qual a regra de MEI da Fix Serviços do Osmar com saldo de R$ 100.332,34 no Inter PJ?"
        scrubbed = self.sanitizer.sanitize_search_query(private_query)
        self.assertNotIn("Fix Serviços", scrubbed)
        self.assertNotIn("Osmar", scrubbed)
        self.assertNotIn("100.332,34", scrubbed)
        self.assertNotIn("Inter", scrubbed)
        self.assertIn("regra de mei", scrubbed.lower())

    def test_consolidado_is_strictly_read_only_scope(self):
        """Proposals targeting CONSOLIDADO must be rejected."""
        res = execute_tool_call(
            "propose_transaction",
            {
                "entity_code": "CONSOLIDADO",
                "amount": 250.0,
                "counterparty": "Kalunga",
            },
        )
        self.assertEqual(res.get("status"), "REJECTED_READ_ONLY_SCOPE")
        self.assertIn("somente leitura", res.get("error", "").lower())


class TestT04ConversationContinuity(unittest.TestCase):
    def setUp(self):
        self.store = ConversationStore()
        self.router = SmartRouter(conversation_store=self.store)

    def test_session_lifecycle_and_deletion(self):
        session = self.store.get_or_create("test_conv_123", default_entity="FIX_SERVICOS")
        self.assertEqual(session.id, "test_conv_123")
        self.assertEqual(session.active_entity, "FIX_SERVICOS")

        session.add_turn(role="user", content="Quanto gastamos em outubro?")
        session.add_turn(role="assistant", content="Gastos de R$ 1.200,00.")
        self.assertEqual(len(session.history), 2)

        retrieved = self.store.get_session("test_conv_123")
        self.assertIsNotNone(retrieved)

        deleted = self.store.delete_session("test_conv_123")
        self.assertTrue(deleted)
        self.assertIsNone(self.store.get_session("test_conv_123"))

    def test_entity_alias_resolution_and_disambiguation(self):
        self.assertEqual(self.store.resolve_entity("Fix"), "FIX_SERVICOS")
        self.assertEqual(self.store.resolve_entity("Facilita"), "FACILITA_VISTORIAS")
        self.assertEqual(self.store.resolve_entity("Nubank pessoal"), "HOUSEHOLD_OSMAR")
        self.assertEqual(self.store.resolve_entity("Consolidado"), "CONSOLIDADO")

        # Disambiguate 'a outra empresa'
        self.assertEqual(
            self.store.resolve_entity("E na outra empresa?", active_entity="FIX_SERVICOS"),
            "FACILITA_VISTORIAS",
        )
        self.assertEqual(
            self.store.resolve_entity("E no outro MEI?", active_entity="FACILITA_VISTORIAS"),
            "FIX_SERVICOS",
        )

    def test_continuity_queries_in_smart_router(self):
        conv_id = "test_conv_flow"
        # Turn 1: Specific expense inquiry
        res1 = self.router.execute_chat(
            "Quanto a Fix gastou em outubro?",
            conversation_id=conv_id,
        )
        self.assertEqual(res1.get("conversation_id"), conv_id)
        self.assertEqual(res1.get("entity"), "FIX_SERVICOS")
        self.assertIn("Fix Serviços MEI", res1["reply"])

        # Turn 2: Follow-up with relative period "E em setembro?"
        res2 = self.router.execute_chat(
            "E em setembro?",
            conversation_id=conv_id,
        )
        self.assertEqual(res2.get("conversation_id"), conv_id)
        self.assertEqual(res2.get("entity"), "FIX_SERVICOS")
        self.assertEqual(res2.get("period"), "2026-09")

        # Turn 3: Entity switch "Agora da Facilita"
        res3 = self.router.execute_chat(
            "Agora da Facilita",
            conversation_id=conv_id,
        )
        self.assertEqual(res3.get("conversation_id"), conv_id)
        self.assertEqual(res3.get("entity"), "FACILITA_VISTORIAS")

        # Turn 4: "Explica de outro jeito"
        res4 = self.router.execute_chat(
            "Explica de outro jeito",
            conversation_id=conv_id,
        )
        self.assertIn("Explicando de outra forma", res4["reply"])


class TestT05TypedToolCallingAndIdempotency(unittest.TestCase):
    def setUp(self):
        self.client = UniversalLLMClient()

    def test_schemas_declared_and_valid(self):
        schema_names = [t["function"]["name"] for t in ASSISTANT_TOOL_SCHEMAS]
        self.assertIn("get_balances", schema_names)
        self.assertIn("query_ledger", schema_names)
        self.assertIn("get_pending_receipts", schema_names)
        self.assertIn("get_mei_ceiling_status", schema_names)
        self.assertIn("get_market_data", schema_names)
        self.assertIn("search_public_web", schema_names)
        self.assertIn("get_official_bcb_data", schema_names)
        self.assertIn("propose_transaction", schema_names)
        self.assertIn("propose_correction", schema_names)

    def test_format_request_with_tools_openai_protocol(self):
        cfg = CustomProviderConfig(
            id="tool-openai",
            name="OpenAI Tools",
            protocol="openai",
            base_url="https://api.openai.com/v1",
            api_key="sk-test",
            model="gpt-4o",
        )
        url, headers, payload = self.client.format_request(
            config=cfg,
            user_prompt="Qual o saldo?",
            tools=ASSISTANT_TOOL_SCHEMAS,
        )
        data = json.loads(payload.decode("utf-8"))
        self.assertIn("tools", data)
        self.assertEqual(data["tool_choice"], "auto")
        self.assertEqual(len(data["tools"]), len(ASSISTANT_TOOL_SCHEMAS))

    def test_format_request_with_tools_anthropic_protocol(self):
        cfg = CustomProviderConfig(
            id="tool-anthropic",
            name="Anthropic Tools",
            protocol="anthropic",
            base_url="https://api.anthropic.com/v1",
            api_key="sk-ant",
            model="claude-3-5-sonnet-20241022",
        )
        url, headers, payload = self.client.format_request(
            config=cfg,
            user_prompt="Qual o saldo?",
            tools=ASSISTANT_TOOL_SCHEMAS,
        )
        data = json.loads(payload.decode("utf-8"))
        self.assertIn("tools", data)
        self.assertIn("input_schema", data["tools"][0])

    def test_parse_response_with_tool_calls(self):
        cfg = CustomProviderConfig(
            id="test", name="T", protocol="openai", base_url="http://x", api_key="k", model="m"
        )
        raw = {
            "choices": [
                {
                    "message": {
                        "content": None,
                        "tool_calls": [
                            {
                                "id": "call_123",
                                "type": "function",
                                "function": {
                                    "name": "get_balances",
                                    "arguments": '{"entity_code": "FIX_SERVICOS"}',
                                },
                            }
                        ],
                    },
                    "finish_reason": "tool_calls",
                }
            ],
            "usage": {"total_tokens": 100},
        }
        resp = self.client.parse_response(cfg, raw)
        self.assertIsNotNone(resp.tool_calls)
        self.assertEqual(len(resp.tool_calls), 1)
        self.assertEqual(resp.tool_calls[0]["name"], "get_balances")
        self.assertEqual(resp.tool_calls[0]["arguments"], {"entity_code": "FIX_SERVICOS"})

    def test_propose_transaction_is_idempotent(self):
        res1 = execute_tool_call(
            "propose_transaction",
            {
                "entity_code": "FIX_SERVICOS",
                "amount": 150.0,
                "counterparty": "Tigre Materiais",
                "date": "2026-11-19",
            },
        )
        res2 = execute_tool_call(
            "propose_transaction",
            {
                "entity_code": "FIX_SERVICOS",
                "amount": 150.0,
                "counterparty": "Tigre Materiais",
                "date": "2026-11-19",
            },
        )
        self.assertEqual(
            res1["confirmation_card"]["card_id"],
            res2["confirmation_card"]["card_id"],
        )

    def test_api_confirm_card_idempotency_and_read_only_boundary(self):
        from fastapi.testclient import TestClient
        from src.web.api import app

        client = TestClient(app)

        # 1. Reject Consolidado scope
        rej_resp = client.post(
            "/api/ledger/confirm-card",
            json={
                "card_id": "CARD-REJECT-CONSOLIDADO",
                "amount": 100.0,
                "date": "2026-11-19",
                "counterparty": "Test",
                "category": "Geral",
                "entity_code": "CONSOLIDADO",
                "account_name": "Geral",
            },
        )
        self.assertEqual(rej_resp.status_code, 400)
        self.assertIn("exclusivo de leitura", rej_resp.json()["detail"].lower())

        # 2. Confirm card first time
        c_id = f"CARD-TEST-IDEMP-{id(self)}"
        resp1 = client.post(
            "/api/ledger/confirm-card",
            json={
                "card_id": c_id,
                "amount": 88.50,
                "date": "2026-11-19",
                "counterparty": "Ferragem do Osmar",
                "category": "Materiais",
                "entity_code": "FIX_SERVICOS",
                "account_name": "Banco Inter PJ",
            },
        )
        self.assertEqual(resp1.status_code, 200)
        data1 = resp1.json()
        self.assertEqual(data1["status"], "CONFIRMED")
        tx_id = data1["transaction_id"]

        # 3. Confirm same card second time (simulating double-click or retry)
        resp2 = client.post(
            "/api/ledger/confirm-card",
            json={
                "card_id": c_id,
                "amount": 88.50,
                "date": "2026-11-19",
                "counterparty": "Ferragem do Osmar",
                "category": "Materiais",
                "entity_code": "FIX_SERVICOS",
                "account_name": "Banco Inter PJ",
            },
        )
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.json()
        # Idempotency prevents duplicate: returns CONFIRMED with idempotent=True and identical tx_id
        self.assertEqual(data2["status"], "CONFIRMED")
        self.assertTrue(data2.get("idempotent"))
        self.assertEqual(data2["transaction_id"], tx_id)


class TestT07WebResearchAndSSRFGuard(unittest.TestCase):
    def setUp(self):
        self.researcher = WebResearchService()

    def test_ssrf_guard_blocks_localhost_and_private_ips(self):
        with self.assertRaises(SecuritySSRFException):
            validate_url_safety("http://localhost:8000/internal")

        with self.assertRaises(SecuritySSRFException):
            validate_url_safety("http://127.0.0.1:8080/secret")

        with self.assertRaises(SecuritySSRFException):
            validate_url_safety("http://169.254.169.254/latest/meta-data/")

        with self.assertRaises(SecuritySSRFException):
            validate_url_safety("http://10.0.0.1/admin")

        with self.assertRaises(SecuritySSRFException):
            validate_url_safety("ftp://example.com/file")

    def test_ssrf_guard_allows_safe_public_urls(self):
        safe_url = validate_url_safety("https://www.bcb.gov.br/controleinflacao/taxaselic")
        self.assertEqual(safe_url, "https://www.bcb.gov.br/controleinflacao/taxaselic")

    def test_official_copom_and_bcb_citations(self):
        citations = self.researcher.search_public_web("Qual foi a última decisão do Copom?")
        self.assertTrue(len(citations) > 0)
        bcb_cit = next((c for c in citations if c.source_name == "Banco Central do Brasil"), None)
        self.assertIsNotNone(bcb_cit)
        self.assertIn("bcb.gov.br", bcb_cit.url)
        self.assertIsNotNone(bcb_cit.reference_date)


if __name__ == "__main__":
    unittest.main()
