"""Internal Transfer Neutralization Engine."""
from datetime import timedelta
from decimal import Decimal
from typing import List, Tuple
import uuid

from src.models.transactions import Transaction, TransferPair
from src.models.enums import TransferType


class TransferNeutralizer:
    """Detects and pairs complementary debit/credit transactions between accounts to eliminate artificial revenue/expense duplication."""

    def __init__(self, max_day_window: int = 2):
        self.max_day_window = max_day_window

    def match_transfers(self, transactions: List[Transaction]) -> Tuple[List[Transaction], List[TransferPair]]:
        """Scans transactions and pairs matching debit and credit entries.
        Returns the updated transaction list and newly generated TransferPair objects.
        """
        # Separate un-paired negative and positive transactions
        debits = [t for t in transactions if t.amount < 0 and not t.is_transfer]
        credits = [t for t in transactions if t.amount > 0 and not t.is_transfer]
        
        pairs: List[TransferPair] = []
        matched_tx_ids = set()

        for d in debits:
            if d.id in matched_tx_ids:
                continue
            debit_abs = abs(d.amount)
            
            # Find matching credit with equal absolute amount within date window
            candidate_credits = [
                c for c in credits
                if c.id not in matched_tx_ids
                and c.account_name != d.account_name
                and c.amount == debit_abs
                and abs((c.date - d.date).days) <= self.max_day_window
            ]
            
            if candidate_credits:
                # Pick the closest credit in time
                matched_credit = min(candidate_credits, key=lambda c: abs((c.date - d.date).days))
                
                pair_id = f"trf-{uuid.uuid4().hex[:8]}"
                
                # Determine transfer type based on entity relationship
                if d.entity_code == matched_credit.entity_code:
                    trf_type = TransferType.INTERNAL_SAME_ENTITY
                elif "FIX" in d.entity_code and "HOUSEHOLD" in matched_credit.entity_code:
                    trf_type = TransferType.PRO_LABORE_PAYMENT
                elif "HOUSEHOLD" in d.entity_code and ("FIX" in matched_credit.entity_code or "FACILITA" in matched_credit.entity_code):
                    trf_type = TransferType.CAPITAL_CONTRIBUTION
                else:
                    trf_type = TransferType.INTERNAL_SAME_ENTITY

                # Mark transactions
                d.is_transfer = True
                d.transfer_pair_id = pair_id
                matched_credit.is_transfer = True
                matched_credit.transfer_pair_id = pair_id
                
                matched_tx_ids.add(d.id)
                matched_tx_ids.add(matched_credit.id)

                pair = TransferPair(
                    id=pair_id,
                    source_transaction_id=d.id,
                    destination_transaction_id=matched_credit.id,
                    amount=debit_abs,
                    source_entity_code=d.entity_code,
                    destination_entity_code=matched_credit.entity_code,
                    transfer_type=trf_type,
                    date=d.date,
                )
                pairs.append(pair)

        return transactions, pairs
