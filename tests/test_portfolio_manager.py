"""Unit tests for PortfolioManager and US Stock Valuation."""
import pytest
from pathlib import Path

from src.models.portfolio import StockPosition
from src.controller.portfolio_manager import PortfolioManager


def test_stock_position_math():
    pos = StockPosition(
        ticker="AAPL",
        shares=10.0,
        avg_cost_usd=150.0,
        current_price_usd=200.0,
        broker="Avenue",
    )
    assert pos.total_usd == 2000.0
    assert pos.total_cost_usd == 1500.0
    assert pos.unrealized_pnl_usd == 500.0
    assert pos.unrealized_pnl_pct == 33.33


def test_portfolio_manager_lifecycle(tmp_path):
    mgr = PortfolioManager(data_dir=str(tmp_path))
    assert mgr.load_positions() == []

    # Upsert single
    pos = mgr.upsert_position(
        ticker="NVDA",
        shares=5.0,
        avg_cost_usd=100.0,
        current_price_usd=135.0,
        broker="Avenue",
    )
    assert pos.ticker == "NVDA"
    assert pos.total_usd == 675.0

    # Batch upsert
    batch = [
        {"ticker": "AAPL", "shares": 10.0, "avg_cost_usd": 180.0, "current_price_usd": 220.0},
        {"ticker": "MSFT", "shares": 4.0, "avg_cost_usd": 400.0, "current_price_usd": 420.0},
    ]
    saved = mgr.batch_upsert(batch, broker_default="Avenue")
    assert len(saved) == 2

    # Verify summary
    summary = mgr.get_summary()
    assert summary.positions_count == 3
    assert summary.total_usd > 0
    assert summary.total_brl > summary.total_usd
    assert summary.ptax_rate > 4.0
    assert "Avenue" in summary.broker_breakdown
    assert summary.cbe_required is False
