"""Unit tests for Indra OCR lazy-loading adapter (Tier 3 fallback)."""
from datetime import date
from decimal import Decimal
import os
import tempfile
import pytest

from src.controller.indra_ocr import IndraOCRAdapter, IndraOCRResult
from src.controller.receipt_store import ReceiptStore
from src.llm.config_manager import CustomProviderConfig


def test_indra_ocr_lazy_lifecycle(tmp_path):
    """Verifies that Indra OCR operates on-demand and does not maintain persistent memory references."""
    dummy_img = tmp_path / "recibo_teste_120.50.jpg"
    dummy_img.write_bytes(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb")

    result = IndraOCRAdapter.extract_from_image_lazy(str(dummy_img), entity_hint="FIX_SERVICOS")
    assert result.success is True
    assert result.memory_cleared is True
    assert result.total_amount == Decimal("120.50")

    receipt = IndraOCRAdapter.create_receipt_model(result, str(dummy_img), entity_hint="FIX_SERVICOS")
    assert receipt.entity_code == "FIX_SERVICOS"
    assert receipt.parser_engine == "INDRA_OCR_CPU_LAZY"
    assert receipt.total_amount == Decimal("120.50")


def test_indra_ocr_regex_parser():
    """Verifies parsing of raw text for CNPJ, amount, and date."""
    sample_text = """
    SUPERMERCADO CENTRAL LTDA
    CNPJ: 14.285.333/0001-90
    DATA: 05/11/2026 14:32:00
    ITEM 01 LEITE INTEGRAL 1L R$ 5,80
    TOTAL A PAGAR R$ 85,40
    FORMA PAGAMENTO: DEBITO
    """
    parsed = IndraOCRAdapter.parse_receipt_text(sample_text)
    assert parsed.cnpj == "14.285.333/0001-90"
    assert parsed.total_amount == Decimal("85.40")
    assert parsed.date == date(2026, 11, 5)


def test_receipt_store_triggers_indra_fallback_when_api_offline(tmp_path):
    """Verifies that when external Vision API is offline, ReceiptStore gracefully uses Indra OCR lazy fallback."""
    store = ReceiptStore(db_path=str(tmp_path / "test_db.json"))
    dummy_img = tmp_path / "cupom_mercado_65.00.jpg"
    dummy_img.write_bytes(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb")

    # Offline/invalid API config to force fallback
    broken_provider = CustomProviderConfig(
        id="broken-probe",
        name="Offline Probe",
        protocol="openai",
        base_url="http://127.0.0.1:9999",
        api_key="invalid-key",
        model="fake-model",
    )

    receipt, matched_tx = store.extract_from_image(
        image_path=str(dummy_img),
        provider_config=broken_provider,
        entity_hint="FACILITA_VISTORIAS",
    )

    assert receipt.entity_code == "FACILITA_VISTORIAS"
    assert receipt.parser_engine == "INDRA_OCR_CPU_LAZY"
    assert receipt.total_amount == Decimal("65.00")
