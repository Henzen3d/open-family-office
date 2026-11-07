"""Credit Card Statement & Settlement Reconciler."""
from typing import List, Tuple

from src.models.transactions import Transaction


class CardReconciler:
    """Ensures credit card purchases are recognized when incurred without double counting when the consolidated card invoice is settled from checking."""

    BILL_PAYMENT_PATTERNS = [
        "PAGAMENTO FATURA",
        "PAGTO FATURA",
        "PAG FATURA",
        "FATURA CARTAO",
        "FATURA NUBANK",
        "FATURA INTER",
        "DEB AUTOM FATURA",
        "PAGTO ELETRON COBRANCA CARTAO",
        "CREDIT CARD PAYMENT",
        "AUTOPAY STATEMENT",
    ]

    def is_card_bill_payment(self, tx: Transaction) -> bool:
        """Determines if a checking account transaction is a settlement of a credit card bill."""
        if tx.amount >= 0:
            return False
        desc = (tx.raw_description + " " + tx.clean_description).upper()
        return any(pattern in desc for pattern in self.BILL_PAYMENT_PATTERNS)

    def reconcile_card_payments(self, transactions: List[Transaction]) -> Tuple[List[Transaction], int]:
        """Marks card bill payments as liability transfers, eliminating double-counted expenses."""
        reconciled_count = 0
        for tx in transactions:
            if self.is_card_bill_payment(tx):
                if not tx.is_transfer:
                    tx.is_transfer = True
                    tx.notes = (tx.notes + " [CARD_BILL_SETTLEMENT: Double-count neutralized]").strip()
                    reconciled_count += 1
        return transactions, reconciled_count
