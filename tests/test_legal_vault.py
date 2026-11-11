"""Unit and integration tests for Legal Vault, AES-256-GCM Encryption & Succession Checklist."""
from __future__ import annotations

import io
import shutil
from pathlib import Path
import pytest
from starlette.testclient import TestClient

from src.security.legal_vault import (
    DocumentMetadataStore,
    SuccessionChecklistManager,
    VaultEncryptionEngine,
)
from src.web.api import app


@pytest.fixture
def tmp_vault(tmp_path: Path):
    vault_dir = tmp_path / "vault"
    engine = VaultEncryptionEngine(vault_dir=vault_dir)
    store = DocumentMetadataStore(vault_dir=vault_dir, encryption_engine=engine)
    return engine, store, vault_dir


def test_vault_encryption_roundtrip_and_integrity(tmp_vault):
    engine, store, _ = tmp_vault

    # 1. Initialize with master password
    engine.initialize("FamiliaSegura@2026")
    assert engine.is_initialized()
    assert engine.is_unlocked()

    # 2. Encrypt sample sensitive deed PDF
    original_data = "%PDF-1.4 Escritura Publica do Imovel Osmar e Vera Matrícula 12345".encode("utf-8")
    encrypted_payload = engine.encrypt_bytes(original_data)

    # Assert payload is not plaintext and contains nonce + ciphertext
    assert original_data not in encrypted_payload
    assert len(encrypted_payload) > len(original_data)

    # 3. Decrypt and verify identical
    decrypted_data = engine.decrypt_bytes(encrypted_payload)
    assert decrypted_data == original_data

    # 4. Tampering detection: Altering a single byte in ciphertext must raise ValueError
    tampered_payload = bytearray(encrypted_payload)
    tampered_payload[-1] ^= 0xFF  # Corrupt 1 bit of tag/ciphertext
    with pytest.raises(ValueError, match="Falha na autenticação GCM"):
        engine.decrypt_bytes(bytes(tampered_payload))


def test_vault_session_locking(tmp_vault):
    engine, _, _ = tmp_vault
    engine.initialize("ChaveForte#9988")

    assert engine.is_unlocked()
    engine.lock()
    assert not engine.is_unlocked()

    # Operations while locked must raise PermissionError
    with pytest.raises(PermissionError, match="Cofre trancado"):
        engine.encrypt_bytes(b"dados")

    # Unlock with wrong password
    assert not engine.unlock("SenhaErrada")
    assert not engine.is_unlocked()

    # Unlock with correct password
    assert engine.unlock("ChaveForte#9988")
    assert engine.is_unlocked()


def test_document_metadata_store(tmp_vault):
    engine, store, _ = tmp_vault
    engine.initialize("MasterPassword123")

    doc_bytes = b"Contrato Social Fix Servicos MEI Osmar"
    record = store.store_document(
        doc_id="DOC-TEST-1",
        filename_orig="contrato_social_fix.pdf",
        category="CORPORATE_MEI",
        description="Contrato Social e CCMEI Fix Serviços",
        issued_date="2024-01-15",
        expiration_date=None,
        registry_office="Junta Comercial de SP",
        tags=["mei", "osmar", "contrato"],
        raw_bytes=doc_bytes,
    )

    assert record["id"] == "DOC-TEST-1"
    assert record["category"] == "CORPORATE_MEI"

    # List documents
    docs = store.list_documents()
    assert len(docs) == 1
    assert docs[0]["filename_orig"] == "contrato_social_fix.pdf"

    # Retrieve and decrypt
    fname, recovered = store.retrieve_document_bytes("DOC-TEST-1")
    assert fname == "contrato_social_fix.pdf"
    assert recovered == doc_bytes

    # Delete
    assert store.delete_document("DOC-TEST-1")
    assert len(store.list_documents()) == 0


def test_succession_checklist_manager():
    catalog_docs = [
        {"id": "d1", "category": "REAL_ESTATE"},
        {"id": "d2", "category": "CORPORATE_MEI"},
        {"id": "d3", "category": "PERSONAL_FAMILY"},
    ]

    res = SuccessionChecklistManager.evaluate(catalog_docs)
    assert 0 <= res["succession_readiness_score"] <= 100
    assert res["total_requirements"] == 8
    assert len(res["checklist"]) == 8
    # 3 categories fulfilled
    assert res["fulfilled_requirements"] >= 3


def test_vault_api_endpoints():
    client = TestClient(app)

    # 1. Status endpoint
    resp_st = client.get("/api/vault/status")
    assert resp_st.status_code == 200
    assert "initialized" in resp_st.json()

    # 2. Unlock or initialize
    resp_unl = client.post(
        "/api/vault/unlock",
        json={"master_password": "SenhaDoCofre#2026"},
    )
    assert resp_unl.status_code in [200, 401]

    # 3. Documents listing
    resp_docs = client.get("/api/vault/documents")
    assert resp_docs.status_code == 200
    assert "documents" in resp_docs.json()

    # 4. Succession checklist
    resp_succ = client.get("/api/vault/succession")
    assert resp_succ.status_code == 200
    assert "succession_readiness_score" in resp_succ.json()
    assert len(resp_succ.json()["checklist"]) == 8
