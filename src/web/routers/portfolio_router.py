"""US Stock Portfolio and Foreign Assets Router for OpenFamilyOffice."""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.models.portfolio import StockPosition
from src.controller.portfolio_manager import PortfolioManager
from src.intelligence.nlp_transaction_parser import parse_us_stocks_list
from src.web.deps import get_data_dir

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


class UpsertPositionRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=10)
    shares: float = Field(..., gt=0)
    avg_cost_usd: Optional[float] = Field(default=None, ge=0)
    current_price_usd: Optional[float] = Field(default=None, ge=0)
    broker: str = Field(default="Avenue")
    notes: Optional[str] = None


class BatchUpsertRequest(BaseModel):
    positions: List[UpsertPositionRequest]
    broker_default: str = Field(default="Avenue")


class NlpPortfolioSyncRequest(BaseModel):
    text: str = Field(..., min_length=2)


@router.get("/us-stocks")
@router.get("/summary")
async def get_portfolio_summary():
    """Returns consolidated US stocks portfolio, current valuation and BRL PTAX equivalent."""
    mgr = PortfolioManager(str(get_data_dir()))
    summary = mgr.get_summary()
    return summary.to_dict()


@router.post("/us-stocks")
async def upsert_position_endpoint(request: UpsertPositionRequest):
    """Adds or updates a single US stock position."""
    mgr = PortfolioManager(str(get_data_dir()))
    pos = mgr.upsert_position(
        ticker=request.ticker,
        shares=request.shares,
        avg_cost_usd=request.avg_cost_usd,
        current_price_usd=request.current_price_usd,
        broker=request.broker,
        notes=request.notes,
    )
    return {
        "status": "SAVED",
        "position": pos.to_dict(),
        "summary": mgr.get_summary().to_dict(),
    }


@router.post("/us-stocks/batch")
async def batch_upsert_endpoint(request: BatchUpsertRequest):
    """Upserts multiple US stock positions in a single call."""
    mgr = PortfolioManager(str(get_data_dir()))
    items = [r.dict() for r in request.positions]
    saved = mgr.batch_upsert(items, broker_default=request.broker_default)
    return {
        "status": "BATCH_SAVED",
        "saved_count": len(saved),
        "positions": [p.to_dict() for p in saved],
        "summary": mgr.get_summary().to_dict(),
    }


@router.post("/us-stocks/sync-nlp")
async def nlp_sync_portfolio_endpoint(request: NlpPortfolioSyncRequest):
    """Parses colloquial natural language text and updates stock positions automatically."""
    parsed = parse_us_stocks_list(request.text)
    if not parsed or not parsed.get("items"):
        raise HTTPException(
            status_code=400,
            detail="Não foi possível identificar ações na mensagem. Exemplo: 'Avenue: 15 AAPL a $180, 10 NVDA'",
        )

    mgr = PortfolioManager(str(get_data_dir()))
    saved = mgr.batch_upsert(parsed["items"], broker_default=parsed.get("broker", "Avenue"))
    summary = mgr.get_summary()

    return {
        "status": "SYNCED",
        "broker": parsed.get("broker", "Avenue"),
        "updated_positions_count": len(saved),
        "positions": [p.to_dict() for p in saved],
        "summary": summary.to_dict(),
    }
