"""OpenFamilyOffice — Legal Vault & Succession Planning Engine.
Provides local-first military-grade encryption (AES-256-GCM + PBKDF2),
document cataloging, and succession readiness auditing.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class VaultEncryptionEngine:
    """Manages master password key derivation, session memory, and AES-256-GCM authenticated encryption."""

    SESSION_TIMEOUT_SECONDS = 900  # 15 minutes of inactivity auto-lock

    def __init__(self, vault_dir: Path):
        self.vault_dir = vault_dir
        self.documents_dir = vault_dir / "documents"
        self.salt_file = vault_dir / "vault_salt.bin"
        self.verifier_file = vault_dir / "vault_verifier.json"

        self._active_key: Optional[bytes] = None
        self._unlocked_at: float = 0.0
        self._failed_attempts: int = 0
        self._lockout_until: float = 0.0

        self._ensure_directories()

    def _ensure_directories(self) -> None:
        self.vault_dir.mkdir(parents=True, exist_ok=True)
        self.documents_dir.mkdir(parents=True, exist_ok=True)

    def is_initialized(self) -> bool:
        """Checks whether a master password has already been configured."""
        return self.salt_file.exists() and self.verifier_file.exists()

    def is_unlocked(self) -> bool:
        """Returns True if the vault session is active and not timed out."""
        if not self._active_key:
            return False
        if time.time() - self._unlocked_at > self.SESSION_TIMEOUT_SECONDS:
            self.lock()
            return False
        return True

    def initialize(self, master_password: str) -> None:
        """Initializes the vault with a new master password, generating salt and verifier."""
        if len(master_password) < 8:
            raise ValueError("A senha-mestre deve conter no mínimo 8 caracteres.")

        salt = os.urandom(32)
        with open(self.salt_file, "wb") as f:
            f.write(salt)

        derived_key = hashlib.pbkdf2_hmac("sha256", master_password.encode("utf-8"), salt, 100_000)
        verifier = hashlib.sha256(derived_key + salt).hexdigest()

        with open(self.verifier_file, "w", encoding="utf-8") as f:
            json.dump({
                "verifier": verifier,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "kdf": "PBKDF2-HMAC-SHA256",
                "iterations": 100_000,
            }, f, indent=2)

        self._active_key = derived_key
        self._unlocked_at = time.time()

    def unlock(self, master_password: str) -> bool:
        """Validates master password, enforces brute-force delay, and starts memory session."""
        if time.time() < self._lockout_until:
            wait_sec = int(self._lockout_until - time.time())
            raise PermissionError(f"Muitas tentativas incorretas. Aguarde {wait_sec} segundos.")

        if not self.is_initialized():
            # If uninitialized, initialize with this password
            self.initialize(master_password)
            return True

        with open(self.salt_file, "rb") as f:
            salt = f.read()

        with open(self.verifier_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            stored_verifier = data.get("verifier")

        derived_key = hashlib.pbkdf2_hmac("sha256", master_password.encode("utf-8"), salt, 100_000)
        check_verifier = hashlib.sha256(derived_key + salt).hexdigest()

        if check_verifier == stored_verifier:
            self._active_key = derived_key
            self._unlocked_at = time.time()
            self._failed_attempts = 0
            return True
        else:
            self._failed_attempts += 1
            if self._failed_attempts >= 5:
                self._lockout_until = time.time() + 30.0  # 30 seconds progressive backoff
            time.sleep(0.3)  # Anti-timing attack delay
            return False

    def lock(self) -> None:
        """Immediately purges master key from memory."""
        self._active_key = None
        self._unlocked_at = 0.0

    def encrypt_bytes(self, data: bytes, associated_data: Optional[bytes] = None) -> bytes:
        """Encrypts data using AES-256-GCM with a fresh 96-bit nonce."""
        if not self.is_unlocked() or not self._active_key:
            raise PermissionError("Cofre trancado. Desbloqueie com a senha-mestre primeiro.")

        nonce = os.urandom(12)
        aesgcm = AESGCM(self._active_key)
        ciphertext = aesgcm.encrypt(nonce, data, associated_data)
        # Store as: [12 bytes nonce] + [ciphertext + 16 bytes tag]
        return nonce + ciphertext

    def decrypt_bytes(self, payload: bytes, associated_data: Optional[bytes] = None) -> bytes:
        """Decrypts AES-256-GCM payload and validates integrity tag."""
        if not self.is_unlocked() or not self._active_key:
            raise PermissionError("Cofre trancado. Desbloqueie com a senha-mestre primeiro.")

        if len(payload) < 28:
            raise ValueError("Carga cifrada corrompida ou inválida.")

        nonce = payload[:12]
        ciphertext = payload[12:]
        aesgcm = AESGCM(self._active_key)

        try:
            return aesgcm.decrypt(nonce, ciphertext, associated_data)
        except Exception as exc:
            raise ValueError("Falha na autenticação GCM: arquivo adulterado ou chave inválida.") from exc


class DocumentMetadataStore:
    """Manages metadata catalog for encrypted documents."""

    CATEGORIES = {
        "REAL_ESTATE": "Imóveis & Matrículas de Cartório",
        "CORPORATE_MEI": "Empresarial & Contratos Sociais MEI",
        "PERSONAL_FAMILY": "Pessoal, Casamento & Pacto Antenupcial",
        "INSURANCE_HEALTH": "Seguros de Vida, Saúde & Quitações",
        "SUCCESSION_WILL": "Sucessão, Testamento & Beneficiários",
    }

    def __init__(self, vault_dir: Path, encryption_engine: VaultEncryptionEngine):
        self.vault_dir = vault_dir
        self.documents_dir = vault_dir / "documents"
        self.catalog_file = vault_dir / "vault_catalog.json"
        self.engine = encryption_engine

    def _load_catalog(self) -> List[Dict[str, Any]]:
        if not self.catalog_file.exists():
            return []
        try:
            with open(self.catalog_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _save_catalog(self, catalog: List[Dict[str, Any]]) -> None:
        with open(self.catalog_file, "w", encoding="utf-8") as f:
            json.dump(catalog, f, indent=2, ensure_ascii=False)

    def list_documents(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        docs = self._load_catalog()
        if category and category != "ALL":
            docs = [d for d in docs if d.get("category") == category]
        return docs

    def store_document(
        self,
        doc_id: str,
        filename_orig: str,
        category: str,
        description: str,
        issued_date: Optional[str],
        expiration_date: Optional[str],
        registry_office: Optional[str],
        tags: List[str],
        raw_bytes: bytes,
    ) -> Dict[str, Any]:
        """Encrypts file on disk and registers metadata in catalog."""
        sha256 = hashlib.sha256(raw_bytes).hexdigest()
        encrypted_bytes = self.engine.encrypt_bytes(raw_bytes)

        stored_file = self.documents_dir / f"{doc_id}.enc"
        with open(stored_file, "wb") as f:
            f.write(encrypted_bytes)

        record = {
            "id": doc_id,
            "filename_orig": filename_orig,
            "category": category,
            "category_label": self.CATEGORIES.get(category, "Geral"),
            "description": description,
            "issued_date": issued_date,
            "expiration_date": expiration_date,
            "registry_office": registry_office,
            "tags": tags,
            "file_size_bytes": len(raw_bytes),
            "sha256_hash": sha256,
            "encrypted_file": f"{doc_id}.enc",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        catalog = self._load_catalog()
        # Replace if existing or append
        catalog = [d for d in catalog if d["id"] != doc_id]
        catalog.append(record)
        self._save_catalog(catalog)

        return record

    def retrieve_document_bytes(self, doc_id: str) -> tuple[str, bytes]:
        """Decrypts and returns (filename_orig, decrypted_bytes)."""
        catalog = self._load_catalog()
        match = next((d for d in catalog if d["id"] == doc_id), None)
        if not match:
            raise FileNotFoundError(f"Documento {doc_id} não encontrado no cofre.")

        stored_file = self.documents_dir / match["encrypted_file"]
        if not stored_file.exists():
            raise FileNotFoundError(f"Arquivo cifrado {match['encrypted_file']} não encontrado no disco.")

        with open(stored_file, "rb") as f:
            encrypted_bytes = f.read()

        plain_bytes = self.engine.decrypt_bytes(encrypted_bytes)
        return match["filename_orig"], plain_bytes

    def delete_document(self, doc_id: str) -> bool:
        catalog = self._load_catalog()
        match = next((d for d in catalog if d["id"] == doc_id), None)
        if not match:
            return False

        stored_file = self.documents_dir / match["encrypted_file"]
        if stored_file.exists():
            stored_file.unlink()

        new_catalog = [d for d in catalog if d["id"] != doc_id]
        self._save_catalog(new_catalog)
        return True


class SuccessionChecklistManager:
    """Audits family succession readiness across 8 institutional checkpoints."""

    CHECKPOINTS = [
        {
            "id": "CHK-1",
            "title": "Certidão de Casamento & Pacto Antenupcial Registrado",
            "category": "PERSONAL_FAMILY",
            "criticality": "high",
            "description": "Certidão averbada com regime de bens definitivo (Comunhão Parcial com partilha clara).",
        },
        {
            "id": "CHK-2",
            "title": "Matrículas Imobiliárias Definitivas",
            "category": "REAL_ESTATE",
            "criticality": "high",
            "description": "Todos os imóveis com matrícula em nome do casal, sem contratos de gaveta pendentes de escritura.",
        },
        {
            "id": "CHK-3",
            "title": "Autorização de Movimentação e Cotitularidade Bancária",
            "category": "PERSONAL_FAMILY",
            "criticality": "high",
            "description": "Procuração bancária mútua para evitar bloqueio judicial imediato de contas em caso de acidente.",
        },
        {
            "id": "CHK-4",
            "title": "Beneficiários Explícitos em Previdência (VGBL/401k)",
            "category": "SUCCESSION_WILL",
            "criticality": "high",
            "description": "Planos de previdência com termo de beneficiários explícitos sem necessidade de abertura de inventário.",
        },
        {
            "id": "CHK-5",
            "title": "Apólices de Seguro de Vida Vigentes no Cofre",
            "category": "INSURANCE_HEALTH",
            "criticality": "medium",
            "description": "Apólice com cobertura adequada para liquidez emergencial dos dependentes nos primeiros 12 meses.",
        },
        {
            "id": "CHK-6",
            "title": "Cláusula de Continuidade / Liquidação nos MEIs",
            "category": "CORPORATE_MEI",
            "criticality": "medium",
            "description": "Definição formal de como os CNPJs Fix Serviços e Facilita Vistorias serão transferidos ou baixados.",
        },
        {
            "id": "CHK-7",
            "title": "Diretivas Antecipadas de Vontade & Procuração Médica",
            "category": "PERSONAL_FAMILY",
            "criticality": "medium",
            "description": "Outorga formal para decisões clínicas e financeiras caso um dos cônjuges fique temporariamente incapacitado.",
        },
        {
            "id": "CHK-8",
            "title": "Guia de Acesso de Emergência aos Herdeiros",
            "category": "SUCCESSION_WILL",
            "criticality": "high",
            "description": "Documento físico em papel com chave de recuperação do cofre e instruções de inventário extrajudicial.",
        },
    ]

    @classmethod
    def evaluate(cls, catalog_docs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculates Succession Readiness Score based on cataloged proofs."""
        # Find which categories have uploaded documents
        cataloged_categories = set(d.get("category") for d in catalog_docs)

        checklist: List[Dict[str, Any]] = []
        fulfilled_count = 0

        for chk in cls.CHECKPOINTS:
            cat = chk["category"]
            # Check if there is at least one document in that category
            has_doc = cat in cataloged_categories
            status = "fulfilled" if has_doc else "pending"
            if has_doc:
                fulfilled_count += 1

            checklist.append({
                **chk,
                "status": status,
                "has_supporting_document": has_doc,
            })

        score_percent = round((fulfilled_count / len(cls.CHECKPOINTS)) * 100, 1)

        if score_percent >= 80.0:
            rating = "Prontidão Sucessória Excelente"
            badge = "emerald"
            summary = "A família possui blindagem institucional sólida para transmissão suave de patrimônio."
        elif score_percent >= 50.0:
            rating = "Prontidão em Estruturação"
            badge = "amber"
            summary = "Estrutura básica iniciada, porém faltam documentos críticos para evitar litígio ou bloqueios."
        else:
            rating = "Vulnerabilidade Sucessória Crítica"
            badge = "rose"
            summary = "Alto risco de bloqueio de contas e inventário contencioso em caso de ausência súbita."

        return {
            "succession_readiness_score": score_percent,
            "fulfilled_requirements": fulfilled_count,
            "total_requirements": len(cls.CHECKPOINTS),
            "rating": rating,
            "badge": badge,
            "summary": summary,
            "checklist": checklist,
        }

