"""Modular API Routers package for OpenFamilyOffice FastAPI Application."""
from src.web.routers.chat_router import router as chat_router
from src.web.routers.statements_router import router as statements_router
from src.web.routers.receipts_router import router as receipts_router
from src.web.routers.market_router import router as market_router
from src.web.routers.settings_router import router as settings_router

__all__ = [
    "chat_router",
    "statements_router",
    "receipts_router",
    "market_router",
    "settings_router",
]

