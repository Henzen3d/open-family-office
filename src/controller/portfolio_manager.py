"""Portfolio Manager for US Stocks and Foreign Assets in OpenFamilyOffice.

Persists equity positions into JSON storage and computes consolidated valuations
in USD and BRL via official Banco Central do Brasil PTAX rate.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any

from src.models.portfolio import (
    StockPosition,
    USPortfolioSummary,
    BENCHMARK_US_PRICES,
    COMPANY_NAMES,
)
from src.engine.forex_cross_border_engine import PtaxRateService


class PortfolioManager:
    """Manages persistent US stocks, foreign asset positions, and PTAX conversions."""

    def __init__(self, data_dir: Optional[str] = None):
        base = Path(data_dir) if data_dir else Path(os.getenv("DATA_DIR", "data"))
        self.portfolio_file = base / "portfolio" / "us_stocks.json"
        self._ensure_storage()

    def _ensure_storage(self):
        """Creates portfolio directory and default file if missing."""
        if not self.portfolio_file.exists():
            self.portfolio_file.parent.mkdir(parents=True, exist_ok=True)
            self._save_raw([])

    def _save_raw(self, positions_data: List[Dict[str, Any]]):
        self.portfolio_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.portfolio_file, "w", encoding="utf-8") as f:
            json.dump(positions_data, f, indent=2, ensure_ascii=False)

    def load_positions(self) -> List[StockPosition]:
        """Loads all US stock positions from disk."""
        if not self.portfolio_file.exists():
            return []
        try:
            with open(self.portfolio_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [
                    StockPosition(
                        ticker=item.get("ticker", ""),
                        shares=float(item.get("shares", 0.0)),
                        avg_cost_usd=float(item.get("avg_cost_usd", 0.0)),
                        current_price_usd=float(item.get("current_price_usd", 0.0)),
                        company_name=item.get("company_name"),
                        broker=item.get("broker", "Avenue"),
                        currency=item.get("currency", "USD"),
                        notes=item.get("notes"),
                        last_updated_at=item.get("last_updated_at", datetime.now(timezone.utc).isoformat()),
                    )
                    for item in data
                    if item.get("ticker")
                ]
        except Exception:
            return []

    def save_positions(self, positions: List[StockPosition]):
        """Saves positions list to disk."""
        raw = [p.to_dict() for p in positions]
        self._save_raw(raw)

    def upsert_position(
        self,
        ticker: str,
        shares: float,
        avg_cost_usd: Optional[float] = None,
        current_price_usd: Optional[float] = None,
        broker: str = "Avenue",
        notes: Optional[str] = None,
    ) -> StockPosition:
        """Adds or updates a single stock position."""
        ticker = ticker.upper().strip()
        positions = self.load_positions()
        existing = next((p for p in positions if p.ticker == ticker and p.broker.lower() == broker.lower()), None)

        cost = avg_cost_usd if avg_cost_usd is not None else (existing.avg_cost_usd if existing else 0.0)
        price = current_price_usd if current_price_usd is not None else (
            existing.current_price_usd if existing and existing.current_price_usd > 0
            else BENCHMARK_US_PRICES.get(ticker, cost or 100.0)
        )

        pos = StockPosition(
            ticker=ticker,
            shares=shares,
            avg_cost_usd=cost,
            current_price_usd=price,
            company_name=COMPANY_NAMES.get(ticker, f"{ticker} Inc."),
            broker=broker,
            notes=notes,
            last_updated_at=datetime.now(timezone.utc).isoformat(),
        )

        if existing:
            idx = positions.index(existing)
            positions[idx] = pos
        else:
            positions.append(pos)

        self.save_positions(positions)
        return pos

    def batch_upsert(self, items: List[Dict[str, Any]], broker_default: str = "Avenue") -> List[StockPosition]:
        """Upserts multiple positions from a parsed list."""
        results = []
        for it in items:
            ticker = it.get("ticker", "").upper().strip()
            if not ticker:
                continue
            shares = float(it.get("shares", 0.0))
            if shares <= 0:
                continue
            cost = float(it.get("avg_cost_usd", 0.0)) if it.get("avg_cost_usd") is not None else None
            price = float(it.get("current_price_usd", 0.0)) if it.get("current_price_usd") is not None else None
            broker = it.get("broker") or broker_default
            pos = self.upsert_position(
                ticker=ticker,
                shares=shares,
                avg_cost_usd=cost,
                current_price_usd=price,
                broker=broker,
                notes=it.get("notes"),
            )
            results.append(pos)
        return results

    def get_summary(self) -> USPortfolioSummary:
        """Calculates total portfolio in USD and converts to BRL using latest PTAX rate."""
        positions = self.load_positions()
        total_usd = sum(p.total_usd for p in positions)

        rates_data = PtaxRateService.get_rates()
        ptax = float(rates_data.get("rates", {}).get("USD_BRL", 5.82))
        total_brl = total_usd * ptax

        broker_breakdown: Dict[str, float] = {}
        for p in positions:
            b = p.broker or "Avenue"
            broker_breakdown[b] = round(broker_breakdown.get(b, 0.0) + p.total_usd, 2)

        # CBE Bacen threshold: US$ 1,000,000.00
        cbe_required = total_usd >= 1000000.0
        cbe_status = (
            "Obrigatória (CBE Bacen Anual — Ativos > US$ 1.000.000)"
            if cbe_required
            else "Isento de Declaração de Capitais no Exterior (CBE Bacen < US$ 1M)"
        )

        return USPortfolioSummary(
            total_usd=total_usd,
            total_brl=total_brl,
            ptax_rate=ptax,
            positions_count=len(positions),
            positions=positions,
            broker_breakdown=broker_breakdown,
            cbe_required=cbe_required,
            cbe_status=cbe_status,
        )
