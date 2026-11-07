"""Receipt to Bank Transaction Anti-Duplication Matcher."""
from datetime import timedelta
from decimal import Decimal
from typing import List, Optional, Tuple

from src.models.receipts import Receipt
from src.models.transactions import Transaction


class ReceiptMatcher:
    """Matches parsed receipts with bank or credit card transactions to prevent double counting."""

    def __init__(self, max_day_window: int = 2):
        self.max_day_window = max_day_window

    def match_receipt(self, receipt: Receipt, transactions: List[Transaction]) -> Tuple[Receipt, Optional[Transaction]]:
        """Finds a matching card or bank transaction for the given receipt.
        Attaches the receipt metadata to the transaction without duplicating expenses.
        """
        candidate_txs = [
            tx for tx in transactions
            if not tx.is_transfer
            and tx.amount < 0
            and abs(tx.amount) == receipt.total_amount
            and abs((tx.date - receipt.issue_date).days) <= self.max_day_window
        ]

        if candidate_txs:
            # Pick the transaction closest in date
            best_tx = min(candidate_txs, key=lambda tx: abs((tx.date - receipt.issue_date).days))
            receipt.matched_transaction_id = best_tx.id
            receipt.status = "MATCHED_TO_BANK"
            
            enrichment_note = f"[RECEIPT_ATTACHED: {receipt.merchant_name} - {len(receipt.items)} items]"
            if enrichment_note not in best_tx.notes:
                best_tx.notes = (best_tx.notes + " " + enrichment_note).strip()
            
            return receipt, best_tx

        # If not matched yet, check payment method
        if receipt.payment_method.upper() == "CASH":
            receipt.status = "APPROVED_CASH"
        else:
            receipt.status = "PENDING_BANK_MATCH"

        return receipt, None

