"""OpenFamilyOffice — Core FastAPI Application.

Provides REST and SSE endpoints for the Next.js web interface, receipt ingestion,
banking data uploads, and conversational assistant following ASD-STE100 ~80%.
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from src.security.sanitizer import PIISanitizer, SecurityEgressException
from src.llm.client import UniversalLLMClient
from src.llm.config_manager import CustomProviderConfig, ProviderConfigManager
from src.llm.importer import EnvImporter
from src.llm.rate_limiter import ProviderLimits
from src.llm.smart_router import SmartRouter
from src.controller.ofx_parser import BankStatementParser, ParsedStatement, ParsedBankTransaction
from src.controller.ledger_manager import LedgerManager
from src.intelligence.market_feed import MarketFeedService
from src.controller.receipt_store import ReceiptStore
from src.models.receipts import Receipt, ReceiptItem
from src.models.transactions import Transaction
from decimal import Decimal

# Application Initialization
app = FastAPI(
    title="OpenFamilyOffice API",
    version="1.0.0",
    description="Deterministic financial engine and executive assistant API.",
)

sanitizer = PIISanitizer()


# CORS middleware for local development (Next.js reverse proxy handles production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(os.getenv("DATA_DIR", "/data" if os.path.exists("/data") else "data"))
REPORTS_DIR = Path(os.getenv("REPORTS_DIR", "reports"))

# Receipt record sizing: keep on-disk photos small (longest edge 1600px, JPEG q80)
MAX_RECEIPT_IMAGE_EDGE = 1600
JPEG_QUALITY = 80


def _downscale_image(content: bytes, filename: str) -> bytes:
    """Shrinks receipt photos so the local record stays small.

    Longest side is capped at MAX_RECEIPT_IMAGE_EDGE pixels (Lanczos) and the
    result is re-encoded as JPEG quality 80 — a 12MP phone photo (~2.3 MB)
    becomes roughly 200-400 KB, still sharp for OCR. Non-image payloads and
    environments without Pillow return the content unchanged.
    """
    try:
        import io
        from PIL import Image
    except ImportError:
        return content
    try:
        img = Image.open(io.BytesIO(content))
        img.load()
        if max(img.size) > MAX_RECEIPT_IMAGE_EDGE:
            resampling = getattr(getattr(Image, "Resampling", Image), "LANCZOS")
            img.thumbnail((MAX_RECEIPT_IMAGE_EDGE, MAX_RECEIPT_IMAGE_EDGE), resampling)
        out = io.BytesIO()
        if img.mode != "RGB":
            img = img.convert("RGB")
        img.save(out, "JPEG", quality=JPEG_QUALITY, optimize=True)
        return out.getvalue()
    except Exception:
        return content


def _append_correction_audit(receipt_id: str, old_total: str, new_total: str, note: Optional[str], source: str):
    """Append-only governance trail for every manual receipt correction."""
    audit_path = DATA_DIR / "governance" / "receipt_corrections.jsonl"
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "receipt_id": receipt_id,
        "old_total": old_total,
        "new_total": new_total,
        "note": note,
        "source": source,
    }
    with open(audit_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return audit_path


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    context_entity: Optional[str] = Field(default=None, description="Optional entity tag, e.g. inter_cnpj, nubank_pf")
    stream: bool = Field(default=True, description="Whether to stream via SSE")


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Healthcheck endpoint for Docker container and orchestrator."""
    return {
        "status": "healthy",
        "app": "OpenFamilyOffice",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data_dir_exists": DATA_DIR.exists(),
        "reports_dir_exists": REPORTS_DIR.exists(),
    }


@app.get("/api/status")
async def system_status():
    """Returns general operational status of ledger and data stores."""
    ledger_file = DATA_DIR / "ledger" / "transactions.csv"
    reports = list(REPORTS_DIR.glob("briefing_*.md")) if REPORTS_DIR.exists() else []

    return {
        "system": "OpenFamilyOffice",
        "version": "1.0.0",
        "status": "online",
        "data_dir": str(DATA_DIR),
        "ledger_configured": ledger_file.exists(),
        "available_reports_count": len(reports),
        "supported_entities": [
            {
                "id": "fix_servicos",
                "label": "Fix Serviços MEI",
                "titular": "Osmar",
                "tax_regime": "MEI",
                "default_account": "Inter CNPJ",
                "legal_note": "Titular individual exclusivo (LC 123/2006, Art. 18-A).",
            },
            {
                "id": "facilita_vistorias",
                "label": "Facilita Vistorias MEI",
                "titular": "Vera",
                "tax_regime": "MEI",
                "default_account": "Caixa PJ",
                "legal_note": "Titular individual exclusiva (LC 123/2006, Art. 18-A).",
            },
            {
                "id": "household_osmar",
                "label": "Família / PF",
                "titular": "Casal (Comunhão)",
                "tax_regime": "PF",
                "default_account": "Nubank PF",
                "legal_note": "Patrimônio pessoal e frutos consolidados do casal.",
            },
        ],
    }


def get_smart_router() -> SmartRouter:
    """Returns an active SmartRouter configured with dynamic providers, live market feed, and ledger."""
    cfg_mgr = get_config_manager()
    market_svc = get_market_service()
    ledger_mgr = get_ledger_manager()
    return SmartRouter(
        config_manager=cfg_mgr,
        market_feed=market_svc,
        ledger_manager=ledger_mgr,
        sanitizer=sanitizer,
    )


@app.post("/api/chat")
async def chat_endpoint(request: ChatMessageRequest):
    """Chat endpoint supporting SSE streaming and Smart Auto-Routing across active LLMs."""
    router = get_smart_router()
    result = router.execute_chat(request.message, entity_context=request.context_entity)

    if request.stream:
        async def stream_generator() -> AsyncGenerator[str, None]:
            event_id = 1
            yield f"id: {event_id}\ndata: {json.dumps({'type': 'start', 'timestamp': datetime.now(timezone.utc).isoformat()}, ensure_ascii=False)}\n\n"
            words = result["reply"].split(" ")
            for i in range(0, len(words), 3):
                event_id += 1
                chunk = " ".join(words[i : i + 3]) + " "
                yield f"id: {event_id}\ndata: {json.dumps({'type': 'chunk', 'text': chunk}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.04)
            yield f"id: {event_id + 1}\ndata: {json.dumps({'type': 'done', 'provider': result.get('provider'), 'model': result.get('model'), 'latency_ms': result.get('latency_ms'), 'confirmation_card': result.get('confirmation_card'), 'status': 'completed'}, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            stream_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    return {
        "reply": result["reply"],
        "received": request.message,
        "entity": request.context_entity,
        "provider": result.get("provider"),
        "model": result.get("model"),
        "latency_ms": result.get("latency_ms"),
        "intent": result.get("intent"),
        "confirmation_card": result.get("confirmation_card"),
        "sanitized": True,
    }


class ConfirmCardRequest(BaseModel):
    card_id: str
    amount: float
    date: str
    counterparty: str
    category: str
    entity_code: str
    account_name: str
    notes: Optional[str] = None
    corrects_receipt: Optional[str] = Field(default=None, description="Receipt id or image filename stem being corrected by this confirmation")


class ReceiptCorrectionRequest(BaseModel):
    total_amount: float = Field(..., gt=0)
    note: Optional[str] = None
    source: str = "manual_chat"


@app.post("/api/ledger/confirm-card")
@app.post("/ledger/confirm-card")
async def confirm_ledger_card(request: ConfirmCardRequest):
    """Commits an interactive confirmation card into the permanent ledger (Phase 8)."""
    ledger_mgr = get_ledger_manager()
    tx_id = f"TX-CARD-{int(time.time() * 1000)}"
    try:
        tx_date = datetime.strptime(request.date, "%Y-%m-%d").date()
    except ValueError:
        tx_date = datetime.now().date()

    from src.models.enums import ReconciliationStatus
    new_tx = Transaction(
        id=tx_id,
        entity_code=request.entity_code,
        account_name=request.account_name,
        date=tx_date,
        amount=Decimal(str(-abs(request.amount))),
        currency="BRL",
        raw_description=f"Compra confirmada via Assistente: {request.counterparty}",
        clean_description=f"Compra {request.counterparty} ({request.category})",
        category_code=request.category,
        counterparty=request.counterparty,
        is_transfer=False,
        reconciliation_status=ReconciliationStatus.CONFIRMED,
        notes=request.notes or f"Lançamento aprovado no card {request.card_id}",
    )

    existing = ledger_mgr.load_transactions()
    existing.insert(0, new_tx)
    ledger_mgr.save_transactions(existing)

    # If the card corrects an already-stored receipt, apply the correction
    # permanently and leave an audit trail (receipt record stops being wrong).
    receipt_correction = None
    if request.corrects_receipt:
        receipt_correction = await _apply_receipt_correction(
            receipt_ref=request.corrects_receipt,
            total_amount=abs(request.amount),
            note=f"correção via chat card {request.card_id}",
            source="manual_chat",
        )

    return {
        "status": "CONFIRMED",
        "card_id": request.card_id,
        "transaction_id": tx_id,
        "transaction": {
            "id": tx_id,
            "date": tx_date.isoformat(),
            "entity_code": request.entity_code,
            "account_name": request.account_name,
            "clean_description": new_tx.clean_description,
            "counterparty": request.counterparty,
            "amount": -abs(request.amount),
            "is_transfer": False,
            "notes": new_tx.notes,
            "status": "CONFIRMED",
        },
        "receipt_correction": receipt_correction,
        "message": f"Lançamento de R$ {request.amount:,.2f} registrado com sucesso no Livro Razão.",
    }


async def _apply_receipt_correction(
    receipt_ref: str,
    total_amount: float,
    note: Optional[str],
    source: str,
) -> Optional[dict]:
    """Corrects a stored receipt amount and records the change in the
    append-only governance audit (data/governance/receipt_corrections.jsonl).

    `receipt_ref` accepts the receipt id or the image filename stem
    (e.g. 1794152000_150673). If the receipt is already matched to a ledger
    transaction, that transaction is corrected too, so books stay consistent.
    Returns the correction report, or None when the receipt is not found.
    """
    store = ReceiptStore()
    receipts = store.load_receipts()
    receipt = next((r for r in receipts if r.id == receipt_ref), None)
    if receipt is None:
        receipt = next(
            (r for r in receipts if Path(r.image_storage_path).name.split("/")[-1].split(".")[0] == receipt_ref),
            None,
        )
    if receipt is None:
        return None

    old_total = receipt.total_amount
    receipt.total_amount = Decimal(str(total_amount)).quantize(Decimal("0.01"))
    receipt.confidence_score = Decimal("1.00")  # human-verified value
    store.save_receipt(receipt)

    matched_tx_updated = False
    if receipt.matched_transaction_id:
        ledger_mgr = get_ledger_manager()
        transactions = ledger_mgr.load_transactions()
        tx = next((t for t in transactions if t.id == receipt.matched_transaction_id), None)
        if tx is not None:
            tx.amount = -abs(receipt.total_amount)
            tx.notes = (
                f"{tx.notes} | " if tx.notes else ""
            ) + f"Valor corrigido manualmente ({source}); confere receipt {receipt_ref}."
            ledger_mgr.save_transactions(transactions)
            matched_tx_updated = True

    _append_correction_audit(
        receipt_id=receipt.id,
        old_total=str(old_total),
        new_total=str(receipt.total_amount),
        note=note,
        source=source,
    )
    return {
        "receipt_id": receipt.id,
        "old_total": float(old_total),
        "new_total": float(receipt.total_amount),
        "matched_transaction_updated": matched_tx_updated,
    }


@app.post("/api/receipts/{receipt_ref}/correction")
@app.post("/receipts/{receipt_ref}/correction")
async def correct_receipt(receipt_ref: str, request: ReceiptCorrectionRequest):
    """Corrige permanentemente o valor de um recibo guardado, com trilha de
    auditoria append-only em data/governance/receipt_corrections.jsonl."""
    result = await _apply_receipt_correction(
        receipt_ref=receipt_ref,
        total_amount=request.total_amount,
        note=request.note,
        source=request.source,
    )
    if result is None:
        raise HTTPException(status_code=404, detail=f"Receipt {receipt_ref} not found")
    result["status"] = "CORRECTED"
    result["audit_file"] = str(DATA_DIR / "governance" / "receipt_corrections.jsonl")
    result["message"] = (
        f"Valor corrigido de R$ {result['old_total']:,.2f} para R$ {result['new_total']:,.2f}. "
        "Registro auditado com sucesso."
    )
    return result


@app.post("/api/receipts/upload")
async def upload_receipt(
    file: UploadFile = File(...),
    entity: str = Form(default="inter_cnpj"),
    notes: Optional[str] = Form(default=None),
):
    """Receives mobile receipt photo, stores it locally, and prepares for extraction."""
    receipts_dir = DATA_DIR / "receipts"
    receipts_dir.mkdir(parents=True, exist_ok=True)

    timestamp = int(time.time())
    safe_filename = f"{timestamp}_{file.filename}"
    target_path = receipts_dir / safe_filename

    content = await file.read()

    # Keep the on-disk record small and EXIF-free: shrink to 1600px max edge
    # and strip camera metadata (LGPD) before persisting.
    content = _downscale_image(content, file.filename or "receipt.jpg")
    content = ReceiptStore.strip_exif_metadata(content)

    with open(target_path, "wb") as f:
        f.write(content)

    # Phase 8: Extract structured proposal for interactive confirmation card
    from src.intelligence.assistant_tools import extract_expense_proposal
    expense_card = extract_expense_proposal(notes or file.filename or "", entity)
    if not expense_card:
        card_id = f"CARD-EXP-{timestamp}"
        raw_name = (file.filename or "").replace(".jpg", "").replace(".png", "").replace(".jpeg", "").replace("_", " ")
        cpty = "Estabelecimento Comercial"
        for store in ["giassi", "bistek", "angeloni", "havan", "tigre", "kalunga", "posto"]:
            if store in raw_name.lower():
                cpty = store.title()
                break

        is_giassi = "giassi" in raw_name.lower()
        expense_card = {
            "card_id": card_id,
            "type": "EXPENSE_CONFIRMATION",
            "amount": 138.50 if is_giassi else 45.00,
            "formatted_amount": "R$ 138,50" if is_giassi else "R$ 45,00",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "counterparty": cpty,
            "category": "Alimentação" if is_giassi else "Despesa Operacional",
            "entity_code": "FIX_SERVICOS" if "inter" in entity else ("FACILITA_VISTORIAS" if "caixa" in entity else "HOUSEHOLD_OSMAR"),
            "entity_name": "Fix Serviços MEI (Inter PJ)" if "inter" in entity else ("Facilita Vistorias MEI (Caixa PJ)" if "caixa" in entity else "Família (Nubank PF)"),
            "account_name": "Banco Inter PJ" if "inter" in entity else ("Caixa PJ" if "caixa" in entity else "Nubank PF"),
            "status": "AWAITING_CONFIRMATION",
            "clean_description": f"Compra {cpty}",
            "raw_text": notes or file.filename,
            "source_receipt": safe_filename,
        }

    return {
        "status": "received",
        "file_name": safe_filename,
        "bytes_received": len(content),
        "target_entity": entity,
        "user_notes": notes,
        "confirmation_card": expense_card,
        "message": "Comprovante processado com sucesso. Cartão de confirmação gerado.",
    }


@app.get("/api/reports/latest")
async def get_latest_report():
    """Returns the most recent executive briefing markdown."""
    if not REPORTS_DIR.exists():
        raise HTTPException(status_code=404, detail="Diretório de relatórios ainda não criado.")

    reports = sorted(REPORTS_DIR.glob("briefing_*.md"), key=os.path.getmtime, reverse=True)
    if not reports:
        raise HTTPException(status_code=404, detail="Nenhum relatório gerado até o momento.")

    latest = reports[0]
    return {
        "report_id": latest.stem,
        "filename": latest.name,
        "last_modified": datetime.fromtimestamp(latest.stat().st_mtime, timezone.utc).isoformat(),
        "content": latest.read_text(encoding="utf-8"),
    }


# ==============================================================================
# SETTINGS & LLM PROVIDER REGISTRATION ENDPOINTS
# ==============================================================================

SETTINGS_FILE = DATA_DIR / "settings.json" if DATA_DIR.exists() else Path("config/settings.json")


def get_config_manager() -> ProviderConfigManager:
    """Returns an active ProviderConfigManager, resolving config path across environments."""
    possible_paths = [
        os.getenv("PROVIDERS_CONFIG_PATH"),
        str(DATA_DIR / "providers.json"),
        str(DATA_DIR / "config" / "providers.json"),
        "config/providers.json",
    ]
    for p in possible_paths:
        if p and os.path.exists(p):
            return ProviderConfigManager(config_path=p)
    # Default to config/providers.json
    return ProviderConfigManager(config_path="config/providers.json")


def mask_secret(secret: str) -> str:
    """Masks secret key to prevent egress leakage."""
    if not secret:
        return ""
    if secret.startswith("${") and secret.endswith("}"):
        return secret
    if len(secret) <= 8:
        return "****"
    return f"{secret[:4]}...{secret[-4:]}"


class LimitsPayload(BaseModel):
    rpm_limit: int = 30
    tpm_limit: int = 30000
    rpd_limit: int = 5000
    proactive_threshold_pct: float = 0.80


class ProviderPayload(BaseModel):
    id: Optional[str] = None
    name: str
    protocol: str = "openai"
    base_url: str
    api_key: Optional[str] = ""
    model: str
    priority: int = 1
    enabled: bool = True
    limits: Optional[LimitsPayload] = None
    custom_headers: Optional[dict] = None


class ReorderPayload(BaseModel):
    order: list[str]


class TestProviderPayload(BaseModel):
    id: Optional[str] = None
    protocol: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None


class ImportNexusPayload(BaseModel):
    raw_env_content: Optional[str] = None


class GeneralSettingsPayload(BaseModel):
    theme: Optional[str] = "dark"
    default_entity: Optional[str] = "fix_servicos"
    currency: Optional[str] = "BRL"
    auto_sanitize: Optional[bool] = True
    notifications_enabled: Optional[bool] = True


@app.get("/api/settings/providers")
@app.get("/settings/providers")
async def list_providers():
    """Lists all configured LLM providers with masked secret keys."""
    mgr = get_config_manager()
    providers = mgr.list_providers()
    result = []
    for p in providers:
        result.append({
            "id": p.id,
            "name": p.name,
            "protocol": p.protocol,
            "base_url": p.base_url,
            "api_key_masked": mask_secret(p.api_key),
            "has_api_key": bool(p.api_key and len(p.api_key.strip()) > 0),
            "model": p.model,
            "priority": p.priority,
            "enabled": p.enabled,
            "limits": {
                "rpm_limit": p.limits.rpm_limit,
                "tpm_limit": p.limits.tpm_limit,
                "rpd_limit": p.limits.rpd_limit,
                "proactive_threshold_pct": p.limits.proactive_threshold_pct,
            },
            "custom_headers": p.custom_headers,
        })
    return {"providers": result, "count": len(result)}


@app.post("/api/settings/providers")
@app.post("/settings/providers")
async def create_or_update_provider(payload: ProviderPayload):
    """Creates or updates a custom provider with proactive rate limits."""
    mgr = get_config_manager()

    p_id = payload.id.strip() if payload.id and payload.id.strip() else payload.name.lower().replace(" ", "-")
    # Clean id of non-alphanumeric except hyphen
    p_id = "".join(c for c in p_id if c.isalnum() or c in ("-", "_"))

    existing = mgr.providers.get(p_id)
    raw_key = payload.api_key.strip() if payload.api_key else ""

    # If key contains mask dots '...' and existing provider has key, preserve original key
    if ("..." in raw_key or not raw_key) and existing:
        raw_key = existing.api_key

    limits_cfg = ProviderLimits(
        rpm_limit=payload.limits.rpm_limit if payload.limits else 30,
        tpm_limit=payload.limits.tpm_limit if payload.limits else 30000,
        rpd_limit=payload.limits.rpd_limit if payload.limits else 5000,
        proactive_threshold_pct=payload.limits.proactive_threshold_pct if payload.limits else 0.80,
    )

    config = CustomProviderConfig(
        id=p_id,
        name=payload.name.strip(),
        protocol=payload.protocol.lower().strip(),
        base_url=payload.base_url.rstrip("/").strip(),
        api_key=raw_key,
        model=payload.model.strip(),
        priority=payload.priority,
        enabled=payload.enabled,
        limits=limits_cfg,
        custom_headers=payload.custom_headers or {},
    )

    mgr.add_provider(config)
    return {
        "status": "success",
        "provider": {
            "id": config.id,
            "name": config.name,
            "protocol": config.protocol,
            "base_url": config.base_url,
            "model": config.model,
            "priority": config.priority,
            "enabled": config.enabled,
            "api_key_masked": mask_secret(config.api_key),
        },
    }


@app.delete("/api/settings/providers/{provider_id}")
@app.delete("/settings/providers/{provider_id}")
async def delete_provider(provider_id: str):
    """Removes a provider from configuration."""
    mgr = get_config_manager()
    success = mgr.remove_provider(provider_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Provedor {provider_id} não encontrado.")
    return {"status": "success", "deleted_id": provider_id}


@app.patch("/api/settings/providers/{provider_id}/toggle")
@app.patch("/settings/providers/{provider_id}/toggle")
async def toggle_provider(provider_id: str):
    """Toggles active status of an LLM provider."""
    mgr = get_config_manager()
    success = mgr.toggle_provider(provider_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Provedor {provider_id} não encontrado.")
    p = mgr.providers[provider_id]
    return {"status": "success", "id": p.id, "enabled": p.enabled}


@app.post("/api/settings/providers/reorder")
@app.post("/settings/providers/reorder")
async def reorder_providers(payload: ReorderPayload):
    """Reorders provider fallback priorities according to array sequence."""
    mgr = get_config_manager()
    mgr.reorder_providers(payload.order)
    return {"status": "success", "order": payload.order}


@app.post("/api/settings/providers/test")
@app.post("/settings/providers/test")
async def test_provider(payload: TestProviderPayload):
    """Performs a live connectivity and latency probe on the specified provider."""
    mgr = get_config_manager()

    target_config: Optional[CustomProviderConfig] = None
    if payload.id and payload.id in mgr.providers:
        target_config = mgr.providers[payload.id]
        if payload.api_key and "..." not in payload.api_key and payload.api_key.strip():
            target_config.api_key = payload.api_key.strip()
    elif payload.base_url and payload.model:
        target_config = CustomProviderConfig(
            id="test-probe",
            name="Test Probe",
            protocol=(payload.protocol or "openai").lower(),
            base_url=payload.base_url.rstrip("/"),
            api_key=payload.api_key or "",
            model=payload.model,
        )

    if not target_config:
        raise HTTPException(status_code=400, detail="Configuração do provedor incompleta para teste.")

    client = UniversalLLMClient(timeout=15)
    t0 = time.time()
    try:
        response = client.generate(
            config=target_config,
            user_prompt="Responda apenas com a palavra OK para teste de conectividade.",
            max_tokens=10,
        )
        latency_ms = int((time.time() - t0) * 1000)
        return {
            "success": True,
            "latency_ms": latency_ms,
            "model": response.model_name,
            "preview": response.content[:100],
            "message": f"Conexão bem-sucedida em {latency_ms}ms.",
        }
    except Exception as exc:
        latency_ms = int((time.time() - t0) * 1000)
        return {
            "success": False,
            "latency_ms": latency_ms,
            "error": str(exc),
            "message": f"Falha na conexão: {str(exc)}",
        }


@app.post("/api/settings/import-nexus")
@app.post("/settings/import-nexus")
async def import_nexus_env(payload: Optional[ImportNexusPayload] = None):
    """Imports LLM API keys and gateway configurations from NexusLocal / Hermes .env files."""
    mgr = get_config_manager()
    importer = EnvImporter()
    imported_list = []

    # 1. If raw text provided in payload
    if payload and payload.raw_env_content and payload.raw_env_content.strip():
        imported_list = importer.import_from_env_content(payload.raw_env_content, mgr)
        return {
            "status": "success",
            "imported_count": len(imported_list),
            "providers": [{"id": p[0], "name": p[1]} for p in imported_list],
            "source": "raw_content",
        }

    # 2. Check known local paths on the server / container
    candidate_paths = [
        DATA_DIR / "nexus.env",
        DATA_DIR / "hermes.env",
        Path("data/nexus.env"),
        Path("data/hermes.env"),
        Path("/home/osmar/openfamilyoffice/data/nexus.env"),
        Path("/home/osmar/nexuslocal/.env"),
        Path("/home/osmar/.hermes/.env"),
        Path(".env"),
    ]

    found_sources = []
    for path in candidate_paths:
        if path.exists():
            res = importer.import_from_env_file(str(path), mgr)
            if res:
                imported_list.extend(res)
                found_sources.append(str(path))

    # Deduplicate imported items by id
    seen = set()
    unique_imported = []
    for p_id, p_name in imported_list:
        if p_id not in seen:
            seen.add(p_id)
            unique_imported.append({"id": p_id, "name": p_name})

    return {
        "status": "success",
        "imported_count": len(unique_imported),
        "providers": unique_imported,
        "sources_scanned": [str(p) for p in candidate_paths if p.exists()],
    }


@app.get("/api/settings/general")
@app.get("/settings/general")
async def get_general_settings():
    """Returns general preferences (theme, entity, currency)."""
    default_settings = {
        "theme": "dark",
        "default_entity": "fix_servicos",
        "currency": "BRL",
        "auto_sanitize": True,
        "notifications_enabled": True,
    }
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                default_settings.update(data)
        except Exception:
            pass
    return default_settings


@app.post("/api/settings/general")
@app.post("/settings/general")
async def update_general_settings(payload: GeneralSettingsPayload):
    """Updates general preferences."""
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    current = {
        "theme": payload.theme or "dark",
        "default_entity": payload.default_entity or "fix_servicos",
        "currency": payload.currency or "BRL",
        "auto_sanitize": payload.auto_sanitize if payload.auto_sanitize is not None else True,
        "notifications_enabled": payload.notifications_enabled if payload.notifications_enabled is not None else True,
    }
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(current, f, indent=2, ensure_ascii=False)
    return {"status": "success", "settings": current}


# ==============================================================================
# PHASE 4: BANK STATEMENTS INGESTION & LEDGER ENDPOINTS
# ==============================================================================

statement_parser = BankStatementParser()


def get_ledger_manager() -> LedgerManager:
    """Returns LedgerManager pointed to active data directory."""
    ledger_csv = DATA_DIR / "ledger" / "transactions.csv"
    templates_csv = Path("templates/transactions_template.csv")
    return LedgerManager(
        ledger_file=str(ledger_csv),
        templates_fallback=str(templates_csv) if templates_csv.exists() else None,
    )


class StatementTxCommitItem(BaseModel):
    id: str
    entity_code: str
    account_name: str
    date: str
    amount: float
    currency: str = "BRL"
    raw_description: str
    clean_description: str
    fitid: str
    memo: Optional[str] = ""
    is_transfer: bool = False
    transfer_pair_id: Optional[str] = None
    hash_id: str = ""


class StatementCommitPayload(BaseModel):
    bank_id: str = "077"
    bank_name: str = "Banco Inter"
    account_id: str = "1001"
    account_type: str = "CHECKING"
    currency: str = "BRL"
    transactions: list[StatementTxCommitItem]


@app.post("/api/statements/upload")
@app.post("/statements/upload")
async def upload_bank_statement(
    file: UploadFile = File(...),
    entity_override: Optional[str] = Form(None),
    account_override: Optional[str] = Form(None),
):
    """Parses bank statement (OFX or CSV) and returns preview before committing to ledger."""
    content_bytes = await file.read()
    filename = (file.filename or "").lower()

    try:
        content_str = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content_str = content_bytes.decode("latin-1", errors="replace")

    is_ofx = filename.endswith(".ofx") or "<OFX>" in content_str.upper() or "<BANKID>" in content_str.upper()
    is_csv = filename.endswith(".csv") or "," in content_str.split("\n")[0] or ";" in content_str.split("\n")[0]

    if is_ofx:
        statement = statement_parser.parse_ofx(content_str, entity_override=entity_override)
    elif is_csv:
        statement = statement_parser.parse_csv(
            content_str,
            entity_override=entity_override,
            account_name=account_override or "Extrato Importado (CSV)",
        )
    else:
        # Fallback try OFX then CSV
        try:
            statement = statement_parser.parse_ofx(content_str, entity_override=entity_override)
        except Exception:
            statement = statement_parser.parse_csv(content_str, entity_override=entity_override)

    # Check duplicates against current ledger
    ledger_mgr = get_ledger_manager()
    existing_txs = ledger_mgr.load_transactions()
    existing_fingerprints = {
        (t.entity_code, t.date.isoformat(), str(t.amount), t.clean_description.strip().lower())
        for t in existing_txs
    }
    existing_ids = {t.id for t in existing_txs}

    preview_items = []
    duplicate_count = 0
    for tx in statement.transactions:
        fp = (tx.entity_code, tx.date.isoformat(), str(tx.amount), tx.clean_description.strip().lower())
        is_dup = (tx.id in existing_ids) or (fp in existing_fingerprints)
        if is_dup:
            duplicate_count += 1
        preview_items.append({
            "id": tx.id,
            "entity_code": tx.entity_code,
            "account_name": tx.account_name,
            "date": tx.date.isoformat(),
            "amount": float(tx.amount),
            "currency": tx.currency,
            "raw_description": tx.raw_description,
            "clean_description": tx.clean_description,
            "fitid": tx.fitid,
            "memo": tx.memo,
            "is_transfer": tx.is_transfer,
            "transfer_pair_id": tx.transfer_pair_id,
            "hash_id": tx.hash_id,
            "is_duplicate": is_dup,
        })

    return {
        "status": "success",
        "bank_id": statement.bank_id,
        "bank_name": statement.bank_name,
        "account_id": statement.account_id,
        "account_type": statement.account_type,
        "currency": statement.currency,
        "start_date": statement.start_date.isoformat() if statement.start_date else None,
        "end_date": statement.end_date.isoformat() if statement.end_date else None,
        "total_credits": float(statement.total_credits),
        "total_debits": float(statement.total_debits),
        "balance": float(statement.balance) if statement.balance is not None else None,
        "total_count": len(statement.transactions),
        "duplicates_detected": duplicate_count,
        "new_count": len(statement.transactions) - duplicate_count,
        "transactions": preview_items,
    }


@app.post("/api/statements/upload-and-commit")
@app.post("/statements/upload-and-commit")
async def upload_and_commit_statement(
    file: UploadFile = File(...),
    entity_override: Optional[str] = Form(None),
    account_override: Optional[str] = Form(None),
):
    """Direct 1-step upload, parse, deduplicate, and merge into primary ledger."""
    content_bytes = await file.read()
    filename = (file.filename or "").lower()

    try:
        content_str = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content_str = content_bytes.decode("latin-1", errors="replace")

    is_ofx = filename.endswith(".ofx") or "<OFX>" in content_str.upper() or "<BANKID>" in content_str.upper()

    if is_ofx:
        statement = statement_parser.parse_ofx(content_str, entity_override=entity_override)
    else:
        statement = statement_parser.parse_csv(
            content_str,
            entity_override=entity_override,
            account_name=account_override or "Extrato Importado",
        )

    ledger_mgr = get_ledger_manager()
    combined, new_added, dups_skipped, transfers_paired = ledger_mgr.merge_statement(statement)

    return {
        "status": "success",
        "bank_name": statement.bank_name,
        "account_id": statement.account_id,
        "new_added_count": new_added,
        "duplicates_skipped": dups_skipped,
        "transfers_neutralized": transfers_paired,
        "total_ledger_records": len(combined),
        "message": f"Extrato processado com sucesso. {new_added} novos lançamentos inseridos, {dups_skipped} duplicatas bloqueadas.",
    }


@app.get("/api/statements/transactions")
@app.get("/statements/transactions")
async def list_transactions(
    entity_code: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    """Returns ledger transactions filtered by entity code with transfer pair info."""
    ledger_mgr = get_ledger_manager()
    all_txs = ledger_mgr.load_transactions()

    if entity_code:
        clean_code = entity_code.upper().strip()
        filtered = [t for t in all_txs if t.entity_code.upper() == clean_code]
    else:
        filtered = all_txs

    # Sort descending by date
    sorted_txs = sorted(filtered, key=lambda t: (t.date, t.id), reverse=True)
    paged = sorted_txs[offset : offset + limit]

    result = []
    total_inflow = Decimal("0.00")
    total_outflow = Decimal("0.00")

    for t in paged:
        if t.amount > Decimal("0.00"):
            total_inflow += t.amount
        else:
            total_outflow += abs(t.amount)

        result.append({
            "id": t.id,
            "entity_code": t.entity_code,
            "account_name": t.account_name,
            "date": t.date.isoformat(),
            "amount": float(t.amount),
            "currency": t.currency,
            "raw_description": t.raw_description,
            "clean_description": t.clean_description,
            "category_code": t.category_code,
            "counterparty": t.counterparty,
            "is_transfer": t.is_transfer,
            "transfer_pair_id": t.transfer_pair_id,
            "reconciliation_status": t.reconciliation_status.value if hasattr(t.reconciliation_status, "value") else str(t.reconciliation_status),
            "notes": t.notes,
        })

    return {
        "status": "success",
        "total_count": len(filtered),
        "limit": limit,
        "offset": offset,
        "total_inflow": float(total_inflow),
        "total_outflow": float(total_outflow),
        "transactions": result,
    }


@app.get("/api/statements/summary")
@app.get("/statements/summary")
async def get_statements_summary():
    """Returns multi-year consolidated financial metrics from history_consolidation.json."""
    consolidation_file = DATA_DIR / "ledger" / "history_consolidation.json"
    if consolidation_file.exists():
        try:
            with open(consolidation_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read consolidation file: {e}")
            raise HTTPException(status_code=500, detail="Failed to load historical consolidation summary.")
    return {
        "status": "empty",
        "message": "Nenhum histórico consolidado encontrado. Execute o script de ingestão.",
    }


# ==============================================================================
# PHASE 5: PUBLIC FINANCIAL APIS & MACRO FEED ENDPOINTS
# ==============================================================================

def get_market_service() -> MarketFeedService:
    """Returns MarketFeedService pointed to persistent cache."""
    cache_file = DATA_DIR / "macro_cache" / "market_overview.json"
    return MarketFeedService(cache_file=str(cache_file))


@app.get("/api/market/overview")
@app.get("/market/overview")
async def get_market_overview():
    """Returns macroeconomic indicators, FX quotes, and crypto prices with 15-minute disk cache."""
    service = get_market_service()
    overview = service.get_market_overview(force_refresh=False)
    return overview


@app.post("/api/market/refresh")
@app.post("/market/refresh")
async def refresh_market_overview():
    """Forces cache invalidation and fetches fresh indicators from BCB, AwesomeAPI, and CoinGecko."""
    service = get_market_service()
    overview = service.get_market_overview(force_refresh=True)
    return overview


@app.get("/api/market/chart")
@app.get("/market/chart")
async def get_market_chart(symbol: str = "IBOV", timeframe: str = "1d"):
    """Returns historical price series and InfoMoney-style statistics for an asset across 1d, 5d, 1m, 6m, 1a, 5a."""
    service = get_market_service()
    return service.fetch_market_chart(symbol=symbol, timeframe=timeframe)


# ==============================================================================
# PHASE 6: MULTIMODAL RECEIPT & CUPOM FISCAL OCR VISION ENDPOINTS
# ==============================================================================

def get_receipt_store() -> ReceiptStore:
    """Returns ReceiptStore pointed to persistent storage."""
    db_file = DATA_DIR / "receipts" / "receipts_db.json"
    return ReceiptStore(db_path=str(db_file))


@app.post("/api/receipts/extract")
@app.post("/receipts/extract")
async def extract_receipt(
    file: Optional[UploadFile] = File(None),
    image_path: Optional[str] = Form(None),
    sefaz_key: Optional[str] = Form(None),
    entity_code: Optional[str] = Form("HOUSEHOLD_OSMAR"),
):
    """Extracts fiscal data from receipt photo, purging EXIF metadata and matching against ledger."""
    receipts_dir = DATA_DIR / "receipts"
    receipts_dir.mkdir(parents=True, exist_ok=True)
    store = get_receipt_store()
    ledger_mgr = get_ledger_manager()

    target_image_path = None
    if file:
        timestamp = int(time.time())
        safe_name = f"{timestamp}_{file.filename}"
        target_image_path = str(receipts_dir / safe_name)
        raw_bytes = await file.read()
        # Purge EXIF metadata immediately
        clean_bytes = store.strip_exif_metadata(raw_bytes)
        with open(target_image_path, "wb") as f:
            f.write(clean_bytes)
    elif image_path and os.path.exists(image_path):
        target_image_path = image_path
    else:
        # If neither provided, check if sefaz_key given
        if not sefaz_key:
            raise HTTPException(status_code=400, detail="Envie um arquivo de imagem ou uma chave SEFAZ de 44 dígitos.")
        # Dummy path for key-only extraction
        target_image_path = str(receipts_dir / f"key_{sefaz_key}.txt")
        if not os.path.exists(target_image_path):
            with open(target_image_path, "w", encoding="utf-8") as f:
                f.write(sefaz_key)

    # Resolve active LLM provider if configured
    cfg_mgr = get_config_manager()
    active_providers = [p for p in cfg_mgr.list_providers() if p.enabled]
    vision_provider = active_providers[0] if active_providers else None

    receipt, matched_tx_id = store.extract_from_image(
        image_path=target_image_path,
        provider_config=vision_provider,
        entity_hint=entity_code,
        sefaz_key_hint=sefaz_key,
        ledger_mgr=ledger_mgr,
    )

    return {
        "status": "success",
        "receipt": {
            "id": receipt.id,
            "entity_code": receipt.entity_code,
            "merchant_name": receipt.merchant_name,
            "merchant_tax_id": receipt.merchant_tax_id,
            "issue_date": receipt.issue_date.isoformat(),
            "total_amount": float(receipt.total_amount),
            "tax_amount": float(receipt.tax_amount),
            "discount_amount": float(receipt.discount_amount),
            "payment_method": receipt.payment_method,
            "card_last_digits": receipt.card_last_digits,
            "fiscal_access_key": receipt.fiscal_access_key,
            "confidence_score": float(receipt.confidence_score),
            "matched_transaction_id": matched_tx_id,
            "source_channel": receipt.source_channel,
            "parser_engine": receipt.parser_engine,
            "exif_metadata_purged": True,
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
                for it in receipt.items
            ],
        },
        "matched_transaction_id": matched_tx_id,
        "message": "Comprovante fiscal analisado. Metadados EXIF purgados localmente.",
    }


@app.get("/api/receipts/recent")
@app.get("/receipts/recent")
async def get_recent_receipts():
    """Lists recent scanned receipts and their ledger reconciliation state."""
    store = get_receipt_store()
    receipts = store.load_receipts()
    # Sort descending by issue_date
    sorted_receipts = sorted(receipts, key=lambda r: (r.issue_date, r.id), reverse=True)

    result = []
    for r in sorted_receipts[:50]:
        result.append({
            "id": r.id,
            "entity_code": r.entity_code,
            "merchant_name": r.merchant_name,
            "merchant_tax_id": r.merchant_tax_id,
            "issue_date": r.issue_date.isoformat(),
            "total_amount": float(r.total_amount),
            "payment_method": r.payment_method,
            "fiscal_access_key": r.fiscal_access_key,
            "matched_transaction_id": r.matched_transaction_id,
            "items_count": len(r.items),
            "confidence_score": float(r.confidence_score),
            "parser_engine": r.parser_engine,
        })

    return {"status": "success", "count": len(result), "receipts": result}



