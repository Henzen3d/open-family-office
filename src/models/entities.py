"""Entities and Accounts data models."""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Dict, Optional

from src.models.enums import EntityType, AccountType


@dataclass
class Entity:
    """Represents a legal participant (Personal household or Business venture)."""
    entity_code: str
    legal_name: str
    trade_name: str
    entity_type: EntityType
    tax_id_masked: str
    jurisdiction: str = "BR"
    primary_currency: str = "BRL"
    owner_principal: str = ""
    active: bool = True
    notes: str = ""
    metadata: Dict[str, str] = field(default_factory=dict)


@dataclass
class Account:
    """Represents a financial account (bank checking, wallet, brokerage)."""
    account_name: str
    entity_code: str
    account_type: AccountType = AccountType.CHECKING
    currency: str = "BRL"
    current_balance: Decimal = Decimal("0.00")
