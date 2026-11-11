"""Macroeconomic Indicators, FX Quotes, and Market Charts Router."""
from __future__ import annotations

from fastapi import APIRouter
from src.web.deps import get_market_service

router = APIRouter(tags=["market"])


@router.get("/api/market/overview")
@router.get("/market/overview")
async def get_market_overview():
    """Returns macroeconomic indicators, FX quotes, and crypto prices with 15-minute disk cache."""
    service = get_market_service()
    return service.get_market_overview(force_refresh=False)


@router.post("/api/market/refresh")
@router.post("/market/refresh")
async def refresh_market_overview():
    """Forces cache invalidation and fetches fresh indicators from BCB, AwesomeAPI, and CoinGecko."""
    service = get_market_service()
    return service.get_market_overview(force_refresh=True)


@router.get("/api/market/chart")
@router.get("/market/chart")
async def get_market_chart(symbol: str = "IBOV", timeframe: str = "1d"):
    """Returns historical price series and InfoMoney-style statistics across timeframes."""
    service = get_market_service()
    return service.fetch_market_chart(symbol=symbol, timeframe=timeframe)

