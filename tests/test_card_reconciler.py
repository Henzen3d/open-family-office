"""Unit tests for the Credit Card Settlement Reconciler."""
from datetime import date
from decimal import Decimal
import unittest

from src.models.transactions import Transaction
from src.controller.card_reconciler import CardReconciler


class TestCardReconciler(unittest.TestCase):

    def setUp(self):
        self.reconciler = CardReconciler()

    def test_identifies_and_neutralizes_card_bill_payments(self):
        tx_bill = Transaction(
            id="tx-bill",
            entity_code="HOUSEHOLD_OSMAR",
            account_name="Nubank Checking",
            date=date(2026, 11, 10),
            amount=Decimal("-1850.25"),
            raw_description="PAGAMENTO FATURA NUBANK",
        )
        tx_grocery = Transaction(
            id="tx-groc",
            entity_code="HOUSEHOLD_OSMAR",
            account_name="Nubank Credit Card",
            date=date(2026, 11, 5),
            amount=Decimal("-150.00"),
            raw_description="SUPERMERCADO",
        )

        txs, count = self.reconciler.reconcile_card_payments([tx_bill, tx_grocery])

        self.assertEqual(count, 1)
        self.assertTrue(tx_bill.is_transfer)
        self.assertIn("CARD_BILL_SETTLEMENT", tx_bill.notes)
        self.assertFalse(tx_grocery.is_transfer)


if __name__ == "__main__":
    unittest.main()

