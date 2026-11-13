"""Modular API Routers package for OpenFamilyOffice FastAPI Application."""
from src.web.routers.chat_router import router as chat_router
from src.web.routers.statements_router import router as statements_router
from src.web.routers.receipts_router import router as receipts_router
from src.web.routers.market_router import router as market_router
from src.web.routers.settings_router import router as settings_router
from src.web.routers.strategy_router import router as strategy_router
from src.web.routers.economic_schools_router import router as economic_schools_router
from src.web.routers.cross_border_router import router as cross_border_router
from src.web.routers.vault_router import router as vault_router
from src.web.routers.portfolio_router import router as portfolio_router
from src.web.routers.reports_router import router as reports_router

__all__ = [
    "chat_router",
    "statements_router",
    "receipts_router",
    "market_router",
    "settings_router",
    "strategy_router",
    "economic_schools_router",
    "cross_border_router",
    "vault_router",
    "portfolio_router",
    "reports_router",
]

