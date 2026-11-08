"""Unit tests for ReceiptProcessor (SEFAZ NFC-e QR decoder & Multimodal Vision parser)."""
from datetime import date
from decimal import Decimal
import unittest

from src.controller.receipt_processor import ReceiptProcessor
from src.models.transactions import Transaction


class TestReceiptProcessor(unittest.TestCase):

    def setUp(self):
        self.processor = ReceiptProcessor()

    def test_parse_sefaz_access_key_direct_44_digits(self):
        # 35 (SP) + 2611 (Nov/2026) + 12345678000195 (CNPJ) + 65 (NFC-e) + 001 (Série) + 000000123 (Num) + 1 (Emissão) + 00000001 (Cód) + 1 (DV)
        raw_key = "35261112345678000195650010000001231000000011"
        res = self.processor.parse_sefaz_access_key(raw_key)

        self.assertIsNotNone(res)
        self.assertEqual(res["uf"], "SP")
        self.assertEqual(res["ano"], "2026")
        self.assertEqual(res["mes"], "11")
        self.assertEqual(res["cnpj_emitente"], "12345678000195")
        self.assertEqual(res["modelo"], "NFC-e")
        self.assertEqual(res["numero_doc"], "000000123")

    def test_parse_sefaz_access_key_from_url_with_param(self):
        url = "https://www.nfce.fazenda.sp.gov.br/qrcode?p=35261112345678000195650010000001231000000011|2|1|1|85.90"
        res = self.processor.parse_sefaz_access_key(url)

        self.assertIsNotNone(res)
        self.assertEqual(res["uf"], "SP")
        self.assertEqual(res["chave_acesso"], "35261112345678000195650010000001231000000011")
        self.assertEqual(res["total_amount"], Decimal("85.90"))

    def test_create_receipt_from_sefaz_key(self):
        key_info = {
            "chave_acesso": "35261112345678000195650010000001231000000011",
            "uf": "SP",
            "ano": "2026",
            "mes": "11",
            "cnpj_emitente": "12345678000195",
            "modelo": "NFC-e",
            "serie": "001",
            "numero_doc": "000000123",
            "total_amount": Decimal("120.50"),
        }
        rcp = self.processor.create_receipt_from_sefaz_key(
            key_info,
            merchant_name="Supermercado Pao de Mel",
            entity_code="HOUSEHOLD_OSMAR",
        )

        self.assertEqual(rcp.merchant_name, "Supermercado Pao de Mel")
        self.assertEqual(rcp.total_amount, Decimal("120.50"))
        self.assertEqual(rcp.merchant_tax_id, "12.345.678/0001-95")
        self.assertEqual(rcp.parser_engine, "QR_CODE_NFCE")
        self.assertEqual(rcp.fiscal_access_key, "35261112345678000195650010000001231000000011")

    def test_parse_vision_json_with_items_and_reconciliation(self):
        sample_json = """
        ```json
        {
          "parser_version": "1.0.0",
          "document_type": "NFCE_BRAZIL",
          "fiscal_access_key": null,
          "merchant": {
            "name": "Supermercado Compre Bem",
            "tax_id": "11.222.333/0001-44",
            "city": "Sao Paulo",
            "state": "SP"
          },
          "transaction": {
            "date": "2026-11-05",
            "time": "14:30:00",
            "total_amount": 75.50,
            "discount_amount": 0.00,
            "tax_amount": 5.20,
            "currency": "BRL"
          },
          "payment": {
            "method": "CREDIT_CARD",
            "card_last_digits": "4321"
          },
          "items": [
            {
              "item_index": 1,
              "description": "Leite Integral 1L",
              "quantity": 3,
              "unit_measure": "UN",
              "unit_price": 5.50,
              "total_price": 16.50,
              "category_code": "PER.GROCERIES"
            },
            {
              "item_index": 2,
              "description": "Cafe Torrado 500g",
              "quantity": 2,
              "unit_measure": "UN",
              "unit_price": 29.50,
              "total_price": 59.00,
              "category_code": "PER.GROCERIES"
            }
          ],
          "audit": {
            "calculated_sum": 75.50,
            "confidence_score": 0.98,
            "target_entity_inferred": "HOUSEHOLD_OSMAR"
          }
        }
        ```
        """
        rcp = self.processor.parse_vision_json(sample_json, image_path="tests/fixtures/cupom.jpg")

        self.assertEqual(rcp.merchant_name, "Supermercado Compre Bem")
        self.assertEqual(rcp.total_amount, Decimal("75.50"))
        self.assertEqual(len(rcp.items), 2)
        self.assertEqual(rcp.items[0].description, "Leite Integral 1L")
        self.assertEqual(rcp.items[1].total_price, Decimal("59.00"))
        self.assertEqual(rcp.confidence_score, Decimal("0.98"))
        self.assertEqual(rcp.entity_code, "HOUSEHOLD_OSMAR")

        # Test Bank Anti-Duplication Reconciliation
        bank_tx = Transaction(
            id="tx-nubank-99",
            entity_code="HOUSEHOLD_OSMAR",
            account_name="Nubank Card PF",
            date=date(2026, 11, 5),
            amount=Decimal("-75.50"),
            currency="BRL",
            raw_description="COMPRE BEM SAO PAULO",
            clean_description="Supermercado Compre Bem",
            category_code="PER.GROCERIES",
            counterparty="Supermercado Compre Bem",
            is_transfer=False,
            notes="",
        )

        rcp_matched, matched_tx, new_tx = self.processor.process_and_reconcile(rcp, [bank_tx])
        self.assertEqual(rcp_matched.status, "MATCHED_TO_BANK")
        self.assertIsNotNone(matched_tx)
        self.assertIsNone(new_tx)  # No duplicate created!
        self.assertIn("[RECEIPT_ATTACHED:", matched_tx.notes)

    def test_process_and_reconcile_unmatched_creates_pending_tx(self):
        sample_json = """
        {
          "transaction": {
            "date": "2026-11-06",
            "total_amount": 32.00
          },
          "merchant": {
            "name": "Padaria Estrela"
          },
          "payment": {
            "method": "PIX"
          },
          "items": [
            {
              "item_index": 1,
              "description": "Pao Frances kg",
              "total_price": 32.00,
              "category_code": "PER.GROCERIES"
            }
          ],
          "audit": {
            "target_entity_inferred": "HOUSEHOLD_OSMAR"
          }
        }
        """
        rcp = self.processor.parse_vision_json(sample_json)
        rcp, matched_tx, new_tx = self.processor.process_and_reconcile(rcp, transactions=[])

        self.assertIsNone(matched_tx)
        self.assertIsNotNone(new_tx)
        self.assertEqual(new_tx.amount, Decimal("-32.00"))
        self.assertEqual(new_tx.counterparty, "Padaria Estrela")
        self.assertEqual(new_tx.reconciliation_status, "PENDING_RECONCILIATION")


if __name__ == "__main__":
    unittest.main()

