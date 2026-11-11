"""Common dependencies, singleton providers, and utility helpers for API routers."""
from __future__ import annotations

import io
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from src.security.sanitizer import PIISanitizer
from src.llm.config_manager import ProviderConfigManager
from src.controller.ledger_manager import LedgerManager
from src.controller.account_manager import AccountManager
from src.controller.receipt_store import ReceiptStore
from src.intelligence.market_feed import MarketFeedService
from src.llm.smart_router import SmartRouter

def get_data_dir() -> Path:
    """Returns dynamically configured DATA_DIR, respecting monkeypatches on src.web.api."""
    try:
        import src.web.api as api_mod
        val = getattr(api_mod, "DATA_DIR", None)
        if val is not None:
            return Path(val)
    except (ImportError, AttributeError):
        pass
    return Path(os.getenv("DATA_DIR", "/data" if os.path.exists("/data") else "data"))


def get_reports_dir() -> Path:
    try:
        import src.web.api as api_mod
        val = getattr(api_mod, "REPORTS_DIR", None)
        if val is not None:
            return Path(val)
    except (ImportError, AttributeError):
        pass
    return Path(os.getenv("REPORTS_DIR", "reports"))


def get_settings_file() -> Path:
    d = get_data_dir()
    return d / "settings.json" if d.exists() else Path("config/settings.json")


DATA_DIR = Path(os.getenv("DATA_DIR", "/data" if os.path.exists("/data") else "data"))
REPORTS_DIR = Path(os.getenv("REPORTS_DIR", "reports"))
SETTINGS_FILE = DATA_DIR / "config" / "general_settings.json"

MAX_RECEIPT_IMAGE_EDGE = 1600
JPEG_QUALITY = 80

sanitizer = PIISanitizer()


def _downscale_image(content: bytes, filename: str) -> bytes:
    """Shrinks receipt photos so the local record stays small."""
    try:
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
    audit_path = get_data_dir() / "governance" / "receipt_corrections.jsonl"
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


def get_config_manager() -> ProviderConfigManager:
    """Returns an active ProviderConfigManager, resolving config path across environments."""
    d = get_data_dir()
    possible_paths = [
        os.getenv("PROVIDERS_CONFIG_PATH"),
        str(d / "providers.json"),
        str(d / "config" / "providers.json"),
        "config/providers.json",
    ]
    for p in possible_paths:
        if p and os.path.exists(p):
            return ProviderConfigManager(config_path=p)
    return ProviderConfigManager(config_path="config/providers.json")


def get_account_manager() -> AccountManager:
    return AccountManager(str(get_data_dir()))


def get_ledger_manager() -> LedgerManager:
    ledger_csv = get_data_dir() / "ledger" / "transactions.csv"
    templates_csv = Path("templates/transactions_template.csv")
    return LedgerManager(
        ledger_file=str(ledger_csv),
        templates_fallback=str(templates_csv) if templates_csv.exists() else None,
    )


def get_market_service() -> MarketFeedService:
    cache_file = get_data_dir() / "macro_cache" / "market_overview.json"
    return MarketFeedService(cache_file=str(cache_file))


def get_receipt_store() -> ReceiptStore:
    db_file = get_data_dir() / "receipts" / "receipts_db.json"
    return ReceiptStore(db_path=str(db_file))


def get_smart_router() -> SmartRouter:
    cfg_mgr = get_config_manager()
    market_svc = get_market_service()
    ledger_mgr = get_ledger_manager()
    return SmartRouter(
        config_manager=cfg_mgr,
        market_feed=market_svc,
        ledger_manager=ledger_mgr,
        sanitizer=sanitizer,
    )


def mask_secret(secret: str) -> str:
    """Masks secret key to prevent egress leakage."""
    if not secret:
        return ""
    if secret.startswith("${") and secret.endswith("}"):
        return secret
    if len(secret) <= 8:
        return "****"
    return f"{secret[:4]}...{secret[-4:]}"


async def get_general_settings():
    """Returns general preferences (theme, entity, currency, asd_mode)."""
    default_settings = {
        "theme": "dark",
        "default_entity": "fix_servicos",
        "currency": "BRL",
        "auto_sanitize": True,
        "notifications_enabled": True,
        "asd_mode": "asd_80",
    }
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                default_settings.update(data)
        except Exception:
            pass
    return default_settings
