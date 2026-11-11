"""Providers, Accounts, and General Settings Router."""
from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.llm.client import UniversalLLMClient
from src.llm.config_manager import CustomProviderConfig
from src.llm.rate_limiter import ProviderLimits
from src.llm.importer import EnvImporter
from src.controller.account_manager import BankAccount
from src.web.deps import (
    get_data_dir,
    get_reports_dir,
    get_settings_file,
    get_config_manager,
    get_account_manager,
    mask_secret,
)

router = APIRouter(tags=["settings"])


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
    asd_mode: Optional[str] = "asd_80"


class BankAccountPayload(BaseModel):
    id: Optional[str] = None
    name: str
    bank_name: Optional[str] = None
    entity_code: str = "HOUSEHOLD_OSMAR"
    holder: Optional[str] = "Osmar & Vera"
    purpose: Optional[str] = "Conta Geral"
    balance: float = 0.0
    account_type: str = "CHECKING"
    color: str = "indigo"
    active: bool = True
    notes: Optional[str] = None


class BalanceAdjustmentPayload(BaseModel):
    account_id: str
    new_balance: float
    note: Optional[str] = None
    source: str = "manual_ui"


@router.get("/api/reports/latest")
@router.get("/reports/latest")
async def get_latest_report():
    """Returns the most recent executive briefing markdown."""
    reports_dir = get_reports_dir()
    if not reports_dir.exists():
        raise HTTPException(status_code=404, detail="Diretório de relatórios ainda não criado.")

    reports = sorted(reports_dir.glob("briefing_*.md"), key=os.path.getmtime, reverse=True)
    if not reports:
        raise HTTPException(status_code=404, detail="Nenhum relatório gerado até o momento.")

    latest = reports[0]
    return {
        "report_id": latest.stem,
        "filename": latest.name,
        "last_modified": datetime.fromtimestamp(latest.stat().st_mtime, timezone.utc).isoformat(),
        "content": latest.read_text(encoding="utf-8"),
    }


@router.get("/api/settings/providers")
@router.get("/settings/providers")
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


@router.post("/api/settings/providers")
@router.post("/settings/providers")
async def create_or_update_provider(payload: ProviderPayload):
    """Creates or updates a custom provider with proactive rate limits."""
    mgr = get_config_manager()

    p_id = payload.id.strip() if payload.id and payload.id.strip() else payload.name.lower().replace(" ", "-")
    p_id = "".join(c for c in p_id if c.isalnum() or c in ("-", "_"))

    existing = mgr.providers.get(p_id)
    raw_key = payload.api_key.strip() if payload.api_key else ""

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


@router.delete("/api/settings/providers/{provider_id}")
@router.delete("/settings/providers/{provider_id}")
async def delete_provider(provider_id: str):
    """Removes a provider from configuration."""
    mgr = get_config_manager()
    success = mgr.remove_provider(provider_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Provedor {provider_id} não encontrado.")
    return {"status": "success", "deleted_id": provider_id}


@router.patch("/api/settings/providers/{provider_id}/toggle")
@router.patch("/settings/providers/{provider_id}/toggle")
async def toggle_provider(provider_id: str):
    """Toggles active status of an LLM provider."""
    mgr = get_config_manager()
    success = mgr.toggle_provider(provider_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Provedor {provider_id} não encontrado.")
    p = mgr.providers[provider_id]
    return {"status": "success", "id": p.id, "enabled": p.enabled}


@router.post("/api/settings/providers/reorder")
@router.post("/settings/providers/reorder")
async def reorder_providers(payload: ReorderPayload):
    """Reorders provider fallback priorities according to array sequence."""
    mgr = get_config_manager()
    mgr.reorder_providers(payload.order)
    return {"status": "success", "order": payload.order}


@router.post("/api/settings/providers/test")
@router.post("/settings/providers/test")
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


@router.post("/api/settings/import-env")
@router.post("/settings/import-env")
@router.post("/api/settings/import-nexus")
@router.post("/settings/import-nexus")
async def import_nexus_env(payload: Optional[ImportNexusPayload] = None):
    """Imports LLM API keys and gateway configurations from .env files or environment."""
    mgr = get_config_manager()
    importer = EnvImporter()
    imported_list = []

    if payload and payload.raw_env_content and payload.raw_env_content.strip():
        imported_list = importer.import_from_env_content(payload.raw_env_content, mgr)
        return {
            "status": "success",
            "imported_count": len(imported_list),
            "providers": [{"id": p[0], "name": p[1]} for p in imported_list],
            "source": "raw_content",
        }

    data_dir = get_data_dir()
    candidate_paths = [
        data_dir / ".env",
        Path(".env"),
        Path("data/.env"),
        data_dir / "hermes.env",
        Path("data/hermes.env"),
        Path("/home/osmar/.hermes/.env"),
    ]

    for path in candidate_paths:
        if path.exists():
            res = importer.import_from_env_file(str(path), mgr)
            if res:
                imported_list.extend(res)

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


@router.get("/api/settings/general")
@router.get("/settings/general")
async def get_general_settings_endpoint():
    """Returns general preferences (theme, entity, currency, asd_mode)."""
    default_settings = {
        "theme": "dark",
        "default_entity": "fix_servicos",
        "currency": "BRL",
        "auto_sanitize": True,
        "notifications_enabled": True,
        "asd_mode": "asd_80",
    }
    settings_file = get_settings_file()
    if settings_file.exists():
        try:
            with open(settings_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                default_settings.update(data)
        except Exception:
            pass
    return default_settings


@router.post("/api/settings/general")
@router.post("/settings/general")
async def update_general_settings(payload: GeneralSettingsPayload):
    """Updates general preferences."""
    settings_file = get_settings_file()
    settings_file.parent.mkdir(parents=True, exist_ok=True)
    current = {
        "theme": payload.theme or "dark",
        "default_entity": payload.default_entity or "fix_servicos",
        "currency": payload.currency or "BRL",
        "auto_sanitize": payload.auto_sanitize if payload.auto_sanitize is not None else True,
        "notifications_enabled": payload.notifications_enabled if payload.notifications_enabled is not None else True,
        "asd_mode": payload.asd_mode or "asd_80",
    }
    with open(settings_file, "w", encoding="utf-8") as f:
        json.dump(current, f, indent=2, ensure_ascii=False)
    return {"status": "success", "settings": current}


@router.get("/api/accounts")
@router.get("/accounts")
async def list_accounts():
    """Lists all configured bank accounts with real adjusted balances and consolidated total."""
    mgr = get_account_manager()
    return mgr.get_consolidated_balances()


@router.post("/api/accounts")
@router.post("/accounts")
async def create_or_update_account(payload: BankAccountPayload):
    """Creates a new bank account or updates existing account configuration."""
    mgr = get_account_manager()
    acct_id = payload.id.strip() if payload.id and payload.id.strip() else payload.name.lower().replace(" ", "_")
    acct_id = "".join(c for c in acct_id if c.isalnum() or c in ("-", "_"))

    acct = BankAccount(
        id=acct_id,
        name=payload.name,
        bank_name=payload.bank_name or payload.name,
        entity_code=payload.entity_code,
        holder=payload.holder or "Osmar & Vera",
        purpose=payload.purpose or "Conta Geral",
        balance=float(payload.balance),
        account_type=payload.account_type,
        color=payload.color,
        active=payload.active,
        notes=payload.notes,
    )
    saved = mgr.add_or_update_account(acct)
    return {"status": "success", "account": saved.to_dict(), "balances": mgr.get_consolidated_balances()}


@router.post("/api/accounts/adjust-balance")
@router.post("/accounts/adjust-balance")
async def adjust_account_balance(payload: BalanceAdjustmentPayload):
    """Directly sets and corrects the balance of an account without requiring past receipts."""
    mgr = get_account_manager()
    adjusted = mgr.adjust_balance(
        account_id=payload.account_id,
        new_balance=payload.new_balance,
        note=payload.note,
        source=payload.source,
    )
    if not adjusted:
        raise HTTPException(status_code=404, detail=f"Conta bancária '{payload.account_id}' não encontrada.")
    return {"status": "success", "account": adjusted.to_dict(), "balances": mgr.get_consolidated_balances()}


@router.delete("/api/accounts/{account_id}")
@router.delete("/accounts/{account_id}")
async def delete_account_endpoint(account_id: str):
    """Deletes an account."""
    mgr = get_account_manager()
    success = mgr.delete_account(account_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Conta '{account_id}' não encontrada.")
    return {"status": "success", "deleted_id": account_id, "balances": mgr.get_consolidated_balances()}
