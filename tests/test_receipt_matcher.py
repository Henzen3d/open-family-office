"""Unit tests for the Receipt Matcher and Anti-Duplication Engine."""
from datetime import date
from decimal import Decimal
import unittest

from src.models.receipts import Receipt, ReceiptItem
from src.models.transactions import Transaction
from src.controller.receipt_matcher import ReceiptMatcher


class TestReceiptMatcher(unittest.TestCase):

    def setUp(self):
        self.matcher = ReceiptMatcher(max_day_window=2)

    def test_matches_supermarket_receipt_to_card_transaction(self):
        # User paid R$ 450 with credit card at Pao de Acucar on Nov 6
        tx_card = Transaction(
            id="tx-nubank-card-1",
            entity_code="HOUSEHOLD_OSMAR",
            account_name="Nubank Credit Card",
            date=date(2026, 11, 6),
            amount=Decimal("-450.00"),
            raw_description="PAO DE ACUCAR",
        )

        receipt = Receipt(
            id="rcpt-001",
            entity_code="HOUSEHOLD_OSMAR",
            image_storage_path="/data/receipts/pao_de_acucar.jpg",
            merchant_name="Pao de Acucar",
            issue_date=date(2026, 11, 6),
            total_amount=Decimal("450.00"),
            payment_method="CREDIT_CARD",
            items=[
                ReceiptItem(item_index=1, description="Leite Integral", unit_price=Decimal("5.50"), total_price=Decimal("11.00")),
                ReceiptItem(item_index=2, description="Cafe Torrado", unit_price=Decimal("19.00"), total_price=Decimal("19.00")),
            ],
        )

        updated_receipt, matched_tx = self.matcher.match_receipt(receipt, [tx_card])

        self.assertIsNotNone(matched_tx)
        self.assertEqual(updated_receipt.status, "MATCHED_TO_BANK")
        self.assertEqual(updated_receipt.matched_transaction_id, "tx-nubank-card-1")
        self.assertIn("[RECEIPT_ATTACHED: Pao de Acucar - 2 items]", matched_tx.notes)

    def test_handles_cash_receipt_when_no_bank_match(self):
        receipt_cash = Receipt(
            id="rcpt-cash-01",
            entity_code="HOUSEHOLD_OSMAR",
            image_storage_path="/data/receipts/padaria.jpg",
            merchant_name="Padaria Central",
            issue_date=date(2026, 11, 7),
            total_amount=Decimal("25.00"),
            payment_method="CASH",
        )

        updated_receipt, matched_tx = self.matcher.match_receipt(receipt_cash, [])

        self.assertIsNone(matched_tx)
        self.assertEqual(updated_receipt.status, "APPROVED_CASH")


if __name__ == "__main__":
    unittest.main()
