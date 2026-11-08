"""Integration and unit tests for FastAPI endpoints in Phases 4, 5, and 6."""
import io
import json
import os
import tempfile
from fastapi.testclient import TestClient
import pytest

from src.web.api import app, DATA_DIR

client = TestClient(app)

SAMPLE_OFX = """OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS><DTSERVER>20261108120000<LANGUAGE>POR</SONRS></SIGNONMSGSRSV1>
<BANKMSGSRSV1><STMTTRNRS><TRNUID>1001<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM><BANKID>077<BRANCHID>0001<ACCTID>987654321<ACCTTYPE>CHECKING</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20261101
<DTEND>20261108
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261103120000
<TRNAMT>4200.00
<FITID>INT-20261103-9991
<MEMO>PIX RECEBIDO CLIENTE XYZ MANUTENCAO
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261104153000
<TRNAMT>-250.00
<FITID>INT-20261104-9992
<MEMO>PIX ENVIADO POSTO IPIRANGA COMBUSTIVEL
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL><BALAMT>3950.00<DTASOF>20261108</LEDGERBAL>
</STMTRS>
</STMTTRNRS></BANKMSGSRSV1>
</OFX>"""


def test_market_overview_and_refresh_endpoints():
    """Verifies GET and POST endpoints for macroeconomic indicators."""
    res = client.get("/api/market/overview")
    assert res.status_code == 200
    data = res.json()
    assert "rates" in data
    assert "currencies" in data
    assert "crypto" in data

    # Test refresh
    res_refresh = client.post("/api/market/refresh")
    assert res_refresh.status_code == 200
    data_refresh = res_refresh.json()
    assert data_refresh["cached"] is False


def test_statements_upload_and_preview(tmp_path, monkeypatch):
    """Verifies parsing and previewing OFX banking statement via upload endpoint."""
    monkeypatch.setattr("src.web.api.DATA_DIR", tmp_path)

    file_bytes = SAMPLE_OFX.encode("utf-8")
    files = {"file": ("inter_statement.ofx", file_bytes, "application/x-ofx")}
    data = {"entity_override": "FIX_SERVICOS"}

    res = client.post("/api/statements/upload", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()

    assert res_data["status"] == "success"
    assert res_data["bank_id"] == "077"
    assert res_data["bank_name"] == "Banco Inter"
    assert res_data["total_count"] == 2
    assert res_data["total_credits"] == 4200.00
    assert res_data["total_debits"] == 250.00
    assert len(res_data["transactions"]) == 2
    assert res_data["transactions"][0]["entity_code"] == "FIX_SERVICOS"


def test_statements_upload_and_commit(tmp_path, monkeypatch):
    """Verifies direct 1-step upload and commit to persistent ledger."""
    monkeypatch.setattr("src.web.api.DATA_DIR", tmp_path)

    file_bytes = SAMPLE_OFX.encode("utf-8")
    files = {"file": ("inter_statement.ofx", file_bytes, "application/x-ofx")}
    data = {"entity_override": "FIX_SERVICOS"}

    res = client.post("/api/statements/upload-and-commit", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()

    assert res_data["status"] == "success"
    assert res_data["new_added_count"] == 2
    assert res_data["duplicates_skipped"] == 0

    # Repeating the upload must skip duplicates (idempotency)
    res_repeat = client.post("/api/statements/upload-and-commit", files=files, data=data)
    assert res_repeat.status_code == 200
    repeat_data = res_repeat.json()
    assert repeat_data["new_added_count"] == 0
    assert repeat_data["duplicates_skipped"] == 2

    # Query transaction listing
    res_list = client.get("/api/statements/transactions?entity_code=FIX_SERVICOS")
    assert res_list.status_code == 200
    list_data = res_list.json()
    assert list_data["total_count"] >= 2
    fitids = [t.get("notes", "") for t in list_data["transactions"]]
    assert any("INT-20261103-9991" in note for note in fitids)


def test_receipt_extraction_and_listing(tmp_path, monkeypatch):
    """Verifies receipt photo ingestion, EXIF purge, and listing."""
    monkeypatch.setattr("src.web.api.DATA_DIR", tmp_path)

    # Fake JPEG with EXIF header
    fake_jpeg_with_exif = (
        b"\xff\xd8"
        b"\xff\xe1\x00\x0cExif\x00\x00GPS_DATA"
        b"\xff\xda"
        b"IMAGE_PAYLOAD"
    )

    files = {"file": ("cupom_posto.jpg", fake_jpeg_with_exif, "image/jpeg")}
    data = {
        "entity_code": "FIX_SERVICOS",
        "sefaz_key": "35261112345678000195650010000000011234567890",
    }

    res = client.post("/api/receipts/extract", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()

    assert res_data["status"] == "success"
    assert res_data["receipt"]["fiscal_access_key"] == "35261112345678000195650010000000011234567890"
    assert res_data["receipt"]["exif_metadata_purged"] is True

    # Test listing recent receipts
    res_recent = client.get("/api/receipts/recent")
    assert res_recent.status_code == 200
    recent_data = res_recent.json()
    assert recent_data["count"] >= 1
    assert recent_data["receipts"][0]["fiscal_access_key"] == "35261112345678000195650010000000011234567890"
