"""Transactions and TransferPair data models."""
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Optional

from src.models.enums import ReconciliationStatus, TransferType


@dataclass
class Transaction:
    """Atomic financial transaction in an account."""
    id: str
    entity_code: str
    account_name: str
    date: date
    amount: Decimal
    currency: str = "BRL"
    raw_description: str = ""
    clean_description: str = ""
    category_code: str = ""
    counterparty: str = ""
    is_transfer: bool = False
    transfer_pair_id: Optional[str] = None
    reconciliation_status: ReconciliationStatus = ReconciliationStatus.CONFIRMED
    notes: str = ""


@dataclass
class TransferPair:
    """Pair of complementary transactions representing an internal movement."""
    id: str
    source_transaction_id: str
    destination_transaction_id: str
    amount: Decimal
    source_entity_code: str
    destination_entity_code: str
    transfer_type: TransferType
    date: date

