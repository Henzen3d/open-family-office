"""OpenFamilyOffice — Core FastAPI Application.

Modularized orchestration layer delegating domain endpoints to:
- src.web.routers.chat_router
- src.web.routers.statements_router
- src.web.routers.receipts_router
- src.web.routers.market_router
- src.web.routers.settings_router
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.web.deps import DATA_DIR, REPORTS_DIR, sanitizer
from src.web.routers import (
    chat_router,
    statements_router,
    receipts_router,
    market_router,
    settings_router,
    strategy_router,
    economic_schools_router,
    cross_border_router,
    vault_router,
    portfolio_router,
    reports_router,
)

# Application Initialization
app = FastAPI(
    title="OpenFamilyOffice API",
    version="1.0.0",
    description="Deterministic financial engine and executive assistant API.",
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


# Include modular domain routers
app.include_router(chat_router)
app.include_router(statements_router)
app.include_router(receipts_router)
app.include_router(market_router)
app.include_router(settings_router)
app.include_router(strategy_router)
app.include_router(economic_schools_router)
app.include_router(cross_border_router)
app.include_router(vault_router)
app.include_router(portfolio_router)
app.include_router(reports_router)

__all__ = ["app", "DATA_DIR", "REPORTS_DIR", "sanitizer"]
