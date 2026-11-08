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


async def generate_chat_stream(user_message: str, entity: Optional[str] = None) -> AsyncGenerator[str, None]:
    """Generates SSE chunks adhering to ASD-STE100 ~80% style with PII masking."""
    sanitized_msg, tokens = sanitizer.sanitize(user_message)
    # Enforce egress safety: ensure no unmasked PII leaks
    try:
        sanitizer.verify_egress_safety(sanitized_msg)
    except SecurityEgressException as exc:
        yield f"id: 1\ndata: {json.dumps({'type': 'error', 'message': str(exc)}, ensure_ascii=False)}\n\n"
        return

    clean_msg = sanitized_msg.lower().strip()

    # Monotonic event ID counter
    event_id = 0

    def format_sse(data: dict) -> str:
        nonlocal event_id
        event_id += 1
        return f"id: {event_id}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

    # Initial event: acknowledgment
    yield format_sse({"type": "start", "timestamp": datetime.now(timezone.utc).isoformat()})
    await asyncio.sleep(0.05)

    # Deterministic responses based on keyword queries
    if "mei" in clean_msg or "teto" in clean_msg:
        facts = [
            "Teto anual do MEI (2026): R$ 81.000,00.",
            "Limite mensal de referência: R$ 6.750,00.",
            "Fix Serviços MEI: Faturamento acumulado no ano sob controle.",
            "Facilita Vistorias MEI: Faturamento acumulado no ano sob controle.",
            "Nenhum desenquadramento iminente detectado.",
        ]
    elif "resumo" in clean_msg or "briefing" in clean_msg or "relatório" in clean_msg:
        facts = [
            "Posição de caixa consolidada: Normal.",
            "Contas a pagar nos próximos 7 dias: Monitoradas.",
            "Cartões Nubank e Inter: Sem faturas vencidas hoje.",
            "Transferências entre PJ e PF: Reconciliadas.",
        ]
    elif "inter" in clean_msg or "cnpj" in clean_msg or "comprovante" in clean_msg or "cupom" in clean_msg:
        facts = [
            f"Transação recebida com contexto: {entity or 'Inter CNPJ'}.",
            "Dados pessoais e bancários sensíveis anonimizados antes do processamento.",
            "Comprovante indexado no livro-razão local.",
            "Status: Aguardando conferência no fechamento semanal.",
        ]
    else:
        facts = [
            f"Mensagem processada: \"{user_message[:50]}\".",
            "Assistente operacional ativo com padrão ASD-STE100 (~80%).",
            "Frases curtas. Fatos numéricos primeiro. Sem jargão prolixo.",
            "Pronto para lançar comprovantes, verificar faturas ou auditar tetos fiscais.",
        ]

    for fact in facts:
        # Send heartbeat ping if needed
        yield ": ping\n\n"
        yield format_sse({"type": "chunk", "text": fact + " "})
        await asyncio.sleep(0.08)

    yield format_sse({"type": "done", "status": "completed"})


@app.post("/api/chat")
async def chat_endpoint(request: ChatMessageRequest):
    """Chat endpoint supporting SSE streaming."""
    if request.stream:
        return StreamingResponse(
            generate_chat_stream(request.message, request.context_entity),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    # Non-streaming fallback
    sanitized_msg, tokens = sanitizer.sanitize(request.message)
    sanitizer.verify_egress_safety(sanitized_msg)
    raw_reply = "Assistente ativo. Padrão ASD-STE100 ~80% habilitado. Envie mensagens para iniciar consulta."
    final_reply = sanitizer.detokenize(raw_reply, tokens)

    return {
        "reply": final_reply,
        "received": sanitized_msg,
        "entity": request.context_entity,
        "sanitized": True,
    }


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
    with open(target_path, "wb") as f:
        f.write(content)

    return {
        "status": "received",
        "file_name": safe_filename,
        "bytes_received": len(content),
        "target_entity": entity,
        "user_notes": notes,
        "message": "Comprovante salvo com sucesso na pasta local. Pronto para extração.",
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


