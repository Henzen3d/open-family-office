"""End-to-end integration tests for receipt upload, correction, ledger sync, and assistant chat."""
from datetime import date
from decimal import Decimal
import io
import json
import os
from pathlib import Path
import pytest
from PIL import Image, ImageDraw

from fastapi.testclient import TestClient

from src.controller.receipt_store import ReceiptStore
from src.controller.ledger_manager import LedgerManager
from src.llm.smart_router import SmartRouter
from src.web.api import app


@pytest.fixture
def test_env(tmp_path, monkeypatch):
    """Sets up an isolated test environment with temporary data directories."""
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("DATA_DIR", str(data_dir))
    import src.web.api as api_mod
    monkeypatch.setattr(api_mod, "DATA_DIR", data_dir)

    receipts_dir = data_dir / "receipts"
    receipts_dir.mkdir(parents=True, exist_ok=True)
    ledger_dir = data_dir / "ledger"
    ledger_dir.mkdir(parents=True, exist_ok=True)

    # Seed initial transactions.csv
    tx_file = ledger_dir / "transactions.csv"
    tx_file.write_text(
        "id,entity_code,account_name,date,amount,currency,raw_description,clean_description,category_code,counterparty,is_transfer,reconciliation_status,notes\n"
        "TX-SEED-01,HOUSEHOLD_OSMAR,Nubank PF,2026-11-08,-150.00,BRL,SUPERMERCADO NUBANK,Supermercado Central,Alimentação,Supermercado Central,False,CONFIRMED,Lançamento de teste\n",
        encoding="utf-8",
    )

    return {
        "data_dir": data_dir,
        "receipts_dir": receipts_dir,
        "ledger_dir": ledger_dir,
        "tx_file": tx_file,
    }


def _create_sample_receipt_image(text_lines):
    """Creates a small valid JPEG image with simulated text."""
    img = Image.new("RGB", (400, 200), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    y = 20
    for line in text_lines:
        draw.text((20, y), line, fill=(0, 0, 0))
        y += 30
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_receipt_upload_no_mock_45(test_env):
    """Verifies that receipt upload does not hardcode R$ 45,00 and persists to ReceiptStore."""
    client = TestClient(app)

    # Create image bytes
    img_bytes = _create_sample_receipt_image([
        "RESTAURANTE BOA MESA LTDA",
        "CNPJ: 33.444.555/0001-66",
        "TOTAL R$ 78,50",
    ])

    resp = client.post(
        "/api/receipts/upload",
        files={"file": ("comprovante_almoco_78.50.jpg", img_bytes, "image/jpeg")},
        data={"entity": "HOUSEHOLD_OSMAR", "notes": "almoço de domingo"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "received"
    assert "receipt_id" in data

    card = data["confirmation_card"]
    # Amount must match extracted number (78.50) from filename/image, NEVER 45.00
    assert card["amount"] == 78.50
    assert "78,50" in card["formatted_amount"]
    assert card["source_receipt"] == data["receipt_id"]

    # Verify receipt is permanently in ReceiptStore
    store = ReceiptStore(db_path=str(test_env["receipts_dir"] / "receipts_db.json"))
    receipts = store.load_receipts()
    assert len(receipts) == 1
    assert receipts[0].id == data["receipt_id"]
    assert receipts[0].total_amount == Decimal("78.50")


def test_receipt_correction_updates_store_and_ledger(test_env):
    """Verifies that correcting a receipt updates the store and commits the transaction."""
    client = TestClient(app)

    # Upload receipt with 78.50
    img_bytes = _create_sample_receipt_image(["TOTAL R$ 78,50"])
    upload_resp = client.post(
        "/api/receipts/upload",
        files={"file": ("recibo_78.50.jpg", img_bytes, "image/jpeg")},
        data={"entity": "FIX_SERVICOS"},
    )
    receipt_id = upload_resp.json()["receipt_id"]

    # User corrects value to 95.00
    corr_resp = client.post(
        f"/api/receipts/{receipt_id}/correction",
        json={"total_amount": 95.00, "note": "Correção manual de valor", "source": "manual_ui"},
    )
    assert corr_resp.status_code == 200
    corr_data = corr_resp.json()
    assert corr_data["status"] == "CORRECTED"
    assert corr_data["new_total"] == 95.00
    assert corr_data["transaction"] is not None

    # Check that transaction exists in ledger
    ledger_mgr = LedgerManager(ledger_file=str(test_env["tx_file"]))
    txs = ledger_mgr.load_transactions()
    matched = [t for t in txs if t.id == corr_data["transaction_id"]]
    assert len(matched) == 1
    assert abs(matched[0].amount) == Decimal("95.00")
    assert "FIX_SERVICOS" in matched[0].entity_code


def test_confirm_card_links_receipt_and_ledger(test_env):
    """Verifies that confirming an expense card commits to ledger and links to the receipt."""
    client = TestClient(app)

    img_bytes = _create_sample_receipt_image(["SUPERMERCADO GIASSI", "TOTAL R$ 112.30"])
    upload_resp = client.post(
        "/api/receipts/upload",
        files={"file": ("cupom_giassi_112.30.jpg", img_bytes, "image/jpeg")},
        data={"entity": "HOUSEHOLD_OSMAR"},
    )
    receipt_id = upload_resp.json()["receipt_id"]

    # Confirm card
    confirm_resp = client.post(
        "/api/ledger/confirm-card",
        json={
            "card_id": "CARD-EXP-12345",
            "amount": 112.30,
            "date": "2026-11-09",
            "counterparty": "Supermercado Giassi",
            "category": "Alimentação",
            "entity_code": "HOUSEHOLD_OSMAR",
            "account_name": "Nubank PF",
            "card_type": "EXPENSE_CONFIRMATION",
            "corrects_receipt": receipt_id,
        },
    )
    assert confirm_resp.status_code == 200
    conf_data = confirm_resp.json()
    assert conf_data["status"] == "CONFIRMED"
    tx_id = conf_data["transaction_id"]

    # Verify receipt is linked
    store = ReceiptStore(db_path=str(test_env["receipts_dir"] / "receipts_db.json"))
    receipts = store.load_receipts()
    rcp = next((r for r in receipts if r.id == receipt_id), None)
    assert rcp is not None
    assert rcp.matched_transaction_id == tx_id


def test_chat_queries_last_receipt_and_last_tx(test_env):
    """Verifies that the chat assistant answers queries about the latest receipt and latest transaction."""
    # 1. Add a receipt
    store = ReceiptStore(db_path=str(test_env["receipts_dir"] / "receipts_db.json"))
    from src.models.receipts import Receipt
    r = Receipt(
        id="rcp-test-999",
        entity_code="HOUSEHOLD_OSMAR",
        image_storage_path="test.jpg",
        merchant_name="Farmácia Popular",
        issue_date=date(2026, 11, 9),
        total_amount=Decimal("43.20"),
        parser_engine="VISION_AI",
        confidence_score=Decimal("0.98"),
    )
    store.save_receipt(r)

    # 2. Add a transaction
    ledger_mgr = LedgerManager(ledger_file=str(test_env["tx_file"]))
    from src.models.transactions import Transaction
    from src.models.enums import ReconciliationStatus
    tx = Transaction(
        id="TX-NEW-01",
        entity_code="HOUSEHOLD_OSMAR",
        account_name="Nubank PF",
        date=date(2026, 11, 9),
        amount=Decimal("-43.20"),
        currency="BRL",
        raw_description="FARMACIA POPULAR",
        clean_description="Compra Farmácia Popular (Saúde)",
        category_code="Saúde",
        counterparty="Farmácia Popular",
        is_transfer=False,
        reconciliation_status=ReconciliationStatus.CONFIRMED,
        notes="Comprovante rcp-test-999",
    )
    txs = ledger_mgr.load_transactions()
    txs.insert(0, tx)
    ledger_mgr.save_transactions(txs)

    # Test Router query
    router = SmartRouter(ledger_manager=ledger_mgr)

    # Ask for last receipt
    rcp_res = router.execute_chat("qual foi o último cupom enviado?")
    assert "Farmácia Popular" in rcp_res["reply"]
    assert "43,20" in rcp_res["reply"]
    assert "rcp-test-999" in rcp_res["reply"]

    # Ask for last transaction
    tx_res = router.execute_chat("qual foi o último lançamento?")
    assert "Farmácia Popular" in tx_res["reply"]
    assert "43,20" in tx_res["reply"]
