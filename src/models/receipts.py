"""Receipt and line items data models."""
from dataclasses import dataclass, field
from datetime import date, time
from decimal import Decimal
from typing import List, Optional


@dataclass
class ReceiptItem:
    """Line item within a parsed receipt."""
    item_index: int
    description: str
    quantity: Decimal = Decimal("1.00")
    unit_measure: str = "UN"
    unit_price: Decimal = Decimal("0.00")
    total_price: Decimal = Decimal("0.00")
    category_code: Optional[str] = None


@dataclass
class Receipt:
    """Represents a receipt or invoice captured via photo, PDF, or NFC-e QR-code."""
    id: str
    entity_code: str
    image_storage_path: str
    merchant_name: str
    issue_date: date
    total_amount: Decimal
    merchant_tax_id: Optional[str] = None
    issue_time: Optional[time] = None
    tax_amount: Decimal = Decimal("0.00")
    discount_amount: Decimal = Decimal("0.00")
    payment_method: str = "UNKNOWN"
    card_last_digits: Optional[str] = None
    fiscal_access_key: Optional[str] = None
    matched_transaction_id: Optional[str] = None
    status: str = "PENDING_APPROVAL"  # "MATCHED_TO_BANK", "PENDING_BANK_MATCH", "APPROVED_CASH", "REJECTED"
    confidence_score: Decimal = Decimal("1.00")
    source_channel: str = "WEB_UPLOAD"  # "WHATSAPP", "TELEGRAM", "WEB_UPLOAD", "CLI"
    parser_engine: str = "QR_CODE_NFCE"  # "QR_CODE_NFCE", "VISION_AI_LOCAL", "VISION_AI_CLOUD"
    items: List[ReceiptItem] = field(default_factory=list)
