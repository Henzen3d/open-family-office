"""Unit tests for ReceiptStore, EXIF purge, and matching."""
from datetime import date
from decimal import Decimal
import os
import unittest

from src.models.receipts import Receipt, ReceiptItem
from src.controller.receipt_store import ReceiptStore
from src.controller.ledger_manager import LedgerManager


class TestReceiptStore(unittest.TestCase):

    def setUp(self):
        self.test_db = "tests/test_receipts_temp.json"
        self.test_ledger = "tests/test_ledger_for_receipts.csv"
        if os.path.exists(self.test_db):
            os.remove(self.test_db)
        if os.path.exists(self.test_ledger):
            os.remove(self.test_ledger)

        self.store = ReceiptStore(db_path=self.test_db)
        self.ledger = LedgerManager(ledger_file=self.test_ledger)

    def tearDown(self):
        if os.path.exists(self.test_db):
            os.remove(self.test_db)
        if os.path.exists(self.test_ledger):
            os.remove(self.test_ledger)

    def test_strip_exif_metadata(self):
        # Fake JPEG with APP1 EXIF block
        fake_jpeg = b"\xff\xd8\xff\xe1\x00\x08EXIF00\xff\xda\x12\x34\xff\xd9"
        cleaned = self.store.strip_exif_metadata(fake_jpeg)
        self.assertTrue(cleaned.startswith(b"\xff\xd8"))
        self.assertNotIn(b"EXIF", cleaned)

    def test_save_and_load_receipt(self):
        rcp = Receipt(
            id="rcp-test-01",
            entity_code="FIX_SERVICOS",
            image_storage_path="uploads/cupom1.jpg",
            merchant_name="Eletro Materiais Ltda",
            issue_date=date(2026, 11, 8),
            total_amount=Decimal("120.50"),
            payment_method="PIX",
            confidence_score=Decimal("0.98"),
            source_channel="CAMERA_PHOTO",
            parser_engine="VISION_AI",
            items=[
                ReceiptItem(
                    item_index=1,
                    description="Cabo Flexivel 2.5mm",
                    quantity=Decimal("20.00"),
                    unit_measure="M",
                    unit_price=Decimal("6.02"),
                    total_price=Decimal("120.40"),
                    category_code="EXP.COGS",
                )
            ],
        )

        self.store.save_receipt(rcp)
        loaded = self.store.load_receipts()
        self.assertEqual(len(loaded), 1)
        self.assertEqual(loaded[0].id, "rcp-test-01")
        self.assertEqual(loaded[0].merchant_name, "Eletro Materiais Ltda")
        self.assertEqual(loaded[0].total_amount, Decimal("120.50"))
        self.assertEqual(len(loaded[0].items), 1)

