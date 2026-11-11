"""OpenFamilyOffice — Legal Vault & Succession Router.
API endpoints for encrypted document storage (AES-256-GCM), unlock/lock lifecycle,
and succession readiness management.
"""
from __future__ import annotations

import io
import time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field

from src.security.legal_vault import (
    DocumentMetadataStore,
    SuccessionChecklistManager,
    VaultEncryptionEngine,
)
from src.web.deps import get_data_dir

router = APIRouter(tags=["vault"])

# Singleton vault engine & metadata store instances
_vault_engine: Optional[VaultEncryptionEngine] = None
_metadata_store: Optional[DocumentMetadataStore] = None


def get_vault_engine() -> VaultEncryptionEngine:
    global _vault_engine
    if _vault_engine is None:
        data_dir = get_data_dir()
        vault_dir = data_dir / "vault"
        _vault_engine = VaultEncryptionEngine(vault_dir=vault_dir)
    return _vault_engine


def get_metadata_store() -> DocumentMetadataStore:
    global _metadata_store
    if _metadata_store is None:
        engine = get_vault_engine()
        data_dir = get_data_dir()
        vault_dir = data_dir / "vault"
        _metadata_store = DocumentMetadataStore(vault_dir=vault_dir, encryption_engine=engine)
    return _metadata_store


class VaultAuthRequest(BaseModel):
    master_password: str = Field(..., min_length=1, description="Senha-mestre do cofre")


@router.get("/api/vault/status")
@router.get("/vault/status")
async def get_vault_status():
    """Returns whether the vault is initialized and whether it is currently unlocked."""
    engine = get_vault_engine()
    return {
        "initialized": engine.is_initialized(),
        "unlocked": engine.is_unlocked(),
    }


@router.post("/api/vault/initialize")
@router.post("/vault/initialize")
async def initialize_vault(request: VaultAuthRequest):
    """Initializes master password for the family vault."""
    engine = get_vault_engine()
    try:
        engine.initialize(request.master_password)
        return {"status": "initialized", "unlocked": True, "message": "Cofre configurado com sucesso."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/api/vault/unlock")
@router.post("/vault/unlock")
async def unlock_vault(request: VaultAuthRequest):
    """Unlocks vault session in memory with the master password."""
    engine = get_vault_engine()
    try:
        success = engine.unlock(request.master_password)
        if success:
            return {"status": "unlocked", "unlocked": True}
        else:
            raise HTTPException(status_code=401, detail="Senha-mestre incorreta.")
    except PermissionError as e:
        raise HTTPException(status_code=429, detail=str(e))


@router.post("/api/vault/lock")
@router.post("/vault/lock")
async def lock_vault():
    """Immediately locks the vault and wipes the master key from RAM."""
    engine = get_vault_engine()
    engine.lock()
    return {"status": "locked", "unlocked": False}


@router.get("/api/vault/documents")
@router.get("/vault/documents")
async def list_vault_documents(category: Optional[str] = None):
    """Returns list of documents in the vault catalog."""
    store = get_metadata_store()
    docs = store.list_documents(category=category)
    return {"documents": docs, "total_count": len(docs)}


@router.post("/api/vault/upload")
@router.post("/vault/upload")
async def upload_vault_document(
    file: UploadFile = File(...),
    category: str = Form("PERSONAL_FAMILY"),
    description: str = Form(""),
    issued_date: Optional[str] = Form(None),
    expiration_date: Optional[str] = Form(None),
    registry_office: Optional[str] = Form(None),
    tags: str = Form(""),
):
    """Encrypts file on disk with AES-256-GCM and records metadata in catalog."""
    engine = get_vault_engine()
    if not engine.is_unlocked():
        raise HTTPException(status_code=403, detail="Cofre trancado. Desbloqueie com a senha-mestre primeiro.")

    store = get_metadata_store()
    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")

    doc_id = f"DOC-{int(time.time() * 1000)}"
    parsed_tags = [t.strip() for t in tags.split(",") if t.strip()]

    try:
        record = store.store_document(
            doc_id=doc_id,
            filename_orig=file.filename or f"{doc_id}.bin",
            category=category,
            description=description,
            issued_date=issued_date,
            expiration_date=expiration_date,
            registry_office=registry_office,
            tags=parsed_tags,
            raw_bytes=raw_bytes,
        )
        return {"status": "stored", "document": record}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criptografar documento: {str(e)}")


@router.get("/api/vault/document/{doc_id}/download")
@router.get("/vault/document/{doc_id}/download")
async def download_vault_document(doc_id: str):
    """Decrypts document on the fly and streams plain bytes to client."""
    engine = get_vault_engine()
    if not engine.is_unlocked():
        raise HTTPException(status_code=403, detail="Cofre trancado. Desbloqueie com a senha-mestre primeiro.")

    store = get_metadata_store()
    try:
        filename, plain_bytes = store.retrieve_document_bytes(doc_id)
        # Infer MIME
        media_type = "application/pdf" if filename.lower().endswith(".pdf") else "application/octet-stream"
        return Response(
            content=plain_bytes,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Documento não encontrado no cofre.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao descriptografar documento: {str(e)}")


@router.delete("/api/vault/document/{doc_id}")
@router.delete("/vault/document/{doc_id}")
async def delete_vault_document(doc_id: str):
    """Deletes document ciphertext from disk and catalog record."""
    store = get_metadata_store()
    success = store.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")
    return {"status": "deleted", "doc_id": doc_id}


@router.get("/api/vault/succession")
@router.get("/vault/succession")
async def get_succession_readiness():
    """Evaluates Succession Readiness Score and checklist based on cataloged documents."""
    store = get_metadata_store()
    docs = store.list_documents()
    return SuccessionChecklistManager.evaluate(docs)

