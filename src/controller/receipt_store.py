"""Receipt Store and Vision Metadata Purge Engine."""
from dataclasses import asdict
from datetime import datetime, date, time
from decimal import Decimal
import io
import json
import os
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Tuple

from src.models.receipts import Receipt, ReceiptItem
from src.controller.receipt_processor import ReceiptProcessor
from src.controller.receipt_matcher import ReceiptMatcher
from src.llm.config_manager import ProviderConfigManager, CustomProviderConfig
from src.llm.client import UniversalLLMClient
from src.controller.ledger_manager import LedgerManager
from src.controller.indra_ocr import IndraOCRAdapter


class ReceiptStore:
    """Manages storage, retrieval, and AI Vision extraction of receipt and fiscal cupom photos."""

    def __init__(self, db_path: Optional[str] = None):
        if db_path:
            self.db_path = Path(db_path)
        else:
            data_dir = Path(os.getenv("DATA_DIR", "data"))
            self.db_path = data_dir / "receipts" / "receipts_db.json"

        self.processor = ReceiptProcessor()
        self.matcher = ReceiptMatcher()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.db_path.exists():
            with open(self.db_path, "w", encoding="utf-8") as f:
                json.dump([], f)

    @staticmethod
    def strip_exif_metadata(image_bytes: bytes) -> bytes:
        """Purges EXIF metadata (GPS location, device serials, camera model) to ensure privacy."""
        # Simple JPEG EXIF marker purge (APP1 / Exif marker 0xFFE1)
        if image_bytes.startswith(b"\xff\xd8"):
            # JPEG file
            cleaned = bytearray()
            cleaned.extend(b"\xff\xd8")
            idx = 2
            length = len(image_bytes)
            while idx < length - 1:
                if image_bytes[idx] == 0xFF:
                    marker = image_bytes[idx + 1]
                    if marker == 0xDA:  # Start of Scan (image data)
                        cleaned.extend(image_bytes[idx:])
                        break
                    elif marker in (0xE1, 0xE2):  # APP1 (EXIF), APP2
                        # Skip this EXIF block
                        if idx + 4 <= length:
                            block_len = (image_bytes[idx + 2] << 8) + image_bytes[idx + 3]
                            idx += 2 + block_len
                            continue
                cleaned.append(image_bytes[idx])
                idx += 1
            return bytes(cleaned)
        return image_bytes

    def load_receipts(self) -> List[Receipt]:
        """Loads all stored receipts from the JSON database."""
        if not self.db_path.exists():
            return []
        try:
            with open(self.db_path, "r", encoding="utf-8") as f:
                raw_list = json.load(f)
                receipts: List[Receipt] = []
                for item in raw_list:
                    items = [
                        ReceiptItem(
                            item_index=i.get("item_index", 1),
                            description=i.get("description", ""),
                            quantity=Decimal(str(i.get("quantity", "1.00"))),
                            unit_measure=i.get("unit_measure", "UN"),
                            unit_price=Decimal(str(i.get("unit_price", "0.00"))),
                            total_price=Decimal(str(i.get("total_price", "0.00"))),
                            category_code=i.get("category_code"),
                        )
                        for i in item.get("items", [])
                    ]
                    r = Receipt(
                        id=item["id"],
                        entity_code=item.get("entity_code", "HOUSEHOLD_OSMAR"),
                        image_storage_path=item.get("image_storage_path", ""),
                        merchant_name=item.get("merchant_name", "Desconhecido"),
                        merchant_tax_id=item.get("merchant_tax_id"),
                        issue_date=datetime.strptime(item["issue_date"], "%Y-%m-%d").date(),
                        total_amount=Decimal(str(item.get("total_amount", "0.00"))),
                        tax_amount=Decimal(str(item.get("tax_amount", "0.00"))),
                        discount_amount=Decimal(str(item.get("discount_amount", "0.00"))),
                        payment_method=item.get("payment_method", "UNKNOWN"),
                        card_last_digits=item.get("card_last_digits"),
                        fiscal_access_key=item.get("fiscal_access_key"),
                        matched_transaction_id=item.get("matched_transaction_id"),
                        confidence_score=Decimal(str(item.get("confidence_score", "1.00"))),
                        source_channel=item.get("source_channel", "CAMERA_PHOTO"),
                        parser_engine=item.get("parser_engine", "VISION_AI"),
                        items=items,
                    )
                    receipts.append(r)
                return receipts
        except Exception:
            return []

    def save_receipt(self, receipt: Receipt):
        """Saves or updates a receipt in the local database."""
        existing = self.load_receipts()
        updated = [r for r in existing if r.id != receipt.id]
        updated.append(receipt)

        serializable = []
        for r in updated:
            serializable.append({
                "id": r.id,
                "entity_code": r.entity_code,
                "image_storage_path": r.image_storage_path,
                "merchant_name": r.merchant_name,
                "merchant_tax_id": r.merchant_tax_id,
                "issue_date": r.issue_date.isoformat(),
                "total_amount": float(r.total_amount),
                "tax_amount": float(r.tax_amount),
                "discount_amount": float(r.discount_amount),
                "payment_method": r.payment_method,
                "card_last_digits": r.card_last_digits,
                "fiscal_access_key": r.fiscal_access_key,
                "matched_transaction_id": r.matched_transaction_id,
                "confidence_score": float(r.confidence_score),
                "source_channel": r.source_channel,
                "parser_engine": r.parser_engine,
                "items": [
                    {
                        "item_index": it.item_index,
                        "description": it.description,
                        "quantity": float(it.quantity),
                        "unit_measure": it.unit_measure,
                        "unit_price": float(it.unit_price),
                        "total_price": float(it.total_price),
                        "category_code": it.category_code,
                    }
                    for it in r.items
                ],
            })

        with open(self.db_path, "w", encoding="utf-8") as f:
            json.dump(serializable, f, indent=2, ensure_ascii=False)

    def extract_from_image(
        self,
        image_path: str,
        provider_config: Optional[CustomProviderConfig] = None,
        entity_hint: Optional[str] = None,
        sefaz_key_hint: Optional[str] = None,
        ledger_mgr: Optional[LedgerManager] = None,
    ) -> Tuple[Receipt, Optional[str]]:
        """Processes a receipt image, purging EXIF data, running SEFAZ QR or Vision LLM, and matching against bank ledger.
        Returns:
            (receipt, matched_tx_id)
        """
        # 1. Check if 44-digit SEFAZ key was passed or found in text/filename
        key_info = None
        if sefaz_key_hint:
            key_info = self.processor.parse_sefaz_access_key(sefaz_key_hint)

        if not key_info:
            # Check filename for 44-digit key
            key_info = self.processor.parse_sefaz_access_key(os.path.basename(image_path))

        if key_info:
            receipt = self.processor.create_receipt_from_sefaz_key(
                key_info=key_info,
                entity_code=entity_hint or "HOUSEHOLD_OSMAR",
            )
        else:
            # 2. Multimodal Vision AI Extraction
            if not provider_config:
                # Use default fallback
                provider_config = CustomProviderConfig(
                    id="gemini-default",
                    name="Google Gemini",
                    protocol="openai",
                    base_url="https://generativelanguage.googleapis.com/v1beta/openai",
                    api_key=os.getenv("GEMINI_API_KEY", ""),
                    model="gemini-2.5-flash",
                )

            # Strip EXIF metadata from image file
            if os.path.exists(image_path):
                with open(image_path, "rb") as f:
                    raw_bytes = f.read()
                clean_bytes = self.strip_exif_metadata(raw_bytes)
                with open(image_path, "wb") as f:
                    f.write(clean_bytes)

            try:
                receipt = self.processor.process_image_with_vision(
                    image_path=image_path,
                    provider_config=provider_config,
                )
                if entity_hint:
                    receipt.entity_code = entity_hint
            except Exception as e:
                # Priority 3 Fallback: Lazy-loaded Indra OCR on CPU (datalab-to/indra)
                # Model stays completely unloaded in RAM until this block is reached
                target_entity = entity_hint or "HOUSEHOLD_OSMAR"
                indra_result = IndraOCRAdapter.extract_from_image_lazy(
                    image_path=image_path,
                    entity_hint=target_entity,
                )
                receipt = IndraOCRAdapter.create_receipt_model(
                    ocr_result=indra_result,
                    image_path=image_path,
                    entity_hint=target_entity,
                )

        # 3. Match against existing bank ledger
        matched_id = None
        if ledger_mgr:
            existing_txs = ledger_mgr.load_transactions()
            receipt, matched_tx = self.matcher.match_receipt(receipt, existing_txs)
            if matched_tx:
                matched_id = matched_tx.id
                receipt.matched_transaction_id = matched_id

        # 4. Save to receipts store
        self.save_receipt(receipt)
        return receipt, matched_id

