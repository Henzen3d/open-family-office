"""Unit tests for the Internal Transfer Neutralizer."""
from datetime import date
from decimal import Decimal
import unittest

from src.models.transactions import Transaction
from src.controller.transfer_neutralizer import TransferNeutralizer
from src.models.enums import TransferType


class TestTransferNeutralizer(unittest.TestCase):

    def setUp(self):
        self.neutralizer = TransferNeutralizer(max_day_window=2)

    def test_matches_pro_labore_transfer(self):
        # Fix sends R$ 2000 on Nov 5, Osmar receives R$ 2000 on Nov 5
        tx_fix = Transaction(
            id="tx-pj-1",
            entity_code="FIX_SERVICOS",
            account_name="Nubank PJ",
            date=date(2026, 11, 5),
            amount=Decimal("-2000.00"),
            raw_description="PIX ENVIADO OSMAR",
        )
        tx_osmar = Transaction(
            id="tx-pf-1",
            entity_code="HOUSEHOLD_OSMAR",
            account_name="Nubank PF",
            date=date(2026, 11, 5),
            amount=Decimal("2000.00"),
            raw_description="PIX RECEBIDO FIX",
        )

        txs, pairs = self.neutralizer.match_transfers([tx_fix, tx_osmar])

        self.assertEqual(len(pairs), 1)
        self.assertTrue(tx_fix.is_transfer)
        self.assertTrue(tx_osmar.is_transfer)
        self.assertEqual(tx_fix.transfer_pair_id, pairs[0].id)
        self.assertEqual(tx_osmar.transfer_pair_id, pairs[0].id)
        self.assertEqual(pairs[0].transfer_type, TransferType.PRO_LABORE_PAYMENT)
        self.assertEqual(pairs[0].amount, Decimal("2000.00"))

    def test_does_not_match_when_amounts_differ(self):
        tx1 = Transaction(
            id="t1",
            entity_code="E1",
            account_name="Acc A",
            date=date(2026, 11, 5),
            amount=Decimal("-1000.00"),
        )
        tx2 = Transaction(
            id="t2",
            entity_code="E2",
            account_name="Acc B",
            date=date(2026, 11, 5),
            amount=Decimal("1500.00"),
        )
        txs, pairs = self.neutralizer.match_transfers([tx1, tx2])
        self.assertEqual(len(pairs), 0)
        self.assertFalse(tx1.is_transfer)
        self.assertFalse(tx2.is_transfer)

    def test_does_not_match_outside_date_window(self):
        tx1 = Transaction(
            id="t1",
            entity_code="E1",
            account_name="Acc A",
            date=date(2026, 11, 1),
            amount=Decimal("-500.00"),
        )
        tx2 = Transaction(
            id="t2",
            entity_code="E2",
            account_name="Acc B",
            date=date(2026, 11, 10),
            amount=Decimal("500.00"),
        )
        txs, pairs = self.neutralizer.match_transfers([tx1, tx2])
        self.assertEqual(len(pairs), 0)


    def test_does_not_neutralize_customer_revenue_or_general_expenses(self):
        # A customer revenue (e.g. Client Alfa paying Fix) must NEVER be neutralized against a household expense
        tx_customer_revenue = Transaction(
            id="tx-rev-client",
            entity_code="FIX_SERVICOS",
            account_name="Inter PJ",
            date=date(2026, 11, 8),
            amount=Decimal("250.00"),
            raw_description="PIX RECEBIDO CLIENTE ALFA",
            clean_description="Instalação Elétrica Residencial",
        )
        tx_grocery_expense = Transaction(
            id="tx-exp-giassi",
            entity_code="HOUSEHOLD_OSMAR",
            account_name="Nubank PF",
            date=date(2026, 11, 8),
            amount=Decimal("-250.00"),
            raw_description="SUPERMERCADO GIASSI",
            clean_description="Compras do mês",
        )

        txs, pairs = self.neutralizer.match_transfers([tx_customer_revenue, tx_grocery_expense])
        self.assertEqual(len(pairs), 0)
        self.assertFalse(tx_customer_revenue.is_transfer)
        self.assertFalse(tx_grocery_expense.is_transfer)


if __name__ == "__main__":
    unittest.main()

