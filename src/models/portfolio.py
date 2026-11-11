"""US Stock Portfolio and Foreign Assets Models for OpenFamilyOffice (Phase 7)."""
from __future__ import annotations

from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any


# Common reference stock prices (USD) for instant valuation when API is offline
BENCHMARK_US_PRICES: Dict[str, float] = {
    "AAPL": 228.50,
    "NVDA": 135.20,
    "MSFT": 425.80,
    "AMZN": 186.40,
    "GOOGL": 178.90,
    "GOOG": 180.20,
    "META": 585.10,
    "TSLA": 250.30,
    "VT": 120.40,
    "VOO": 540.20,
    "VTI": 290.10,
    "QQQ": 490.50,
    "SPY": 588.60,
    "IVV": 590.10,
    "SCHD": 82.50,
    "KO": 69.20,
    "JNJ": 162.40,
    "BRK.B": 465.10,
    "AMD": 155.00,
    "BND": 72.80,
}

COMPANY_NAMES: Dict[str, str] = {
    "AAPL": "Apple Inc.",
    "NVDA": "NVIDIA Corporation",
    "MSFT": "Microsoft Corporation",
    "AMZN": "Amazon.com Inc.",
    "GOOGL": "Alphabet Inc. (Class A)",
    "GOOG": "Alphabet Inc. (Class C)",
    "META": "Meta Platforms Inc.",
    "TSLA": "Tesla Inc.",
    "VT": "Vanguard Total World Stock ETF",
    "VOO": "Vanguard S&P 500 ETF",
    "VTI": "Vanguard Total Stock Market ETF",
    "QQQ": "Invesco QQQ Trust (Nasdaq 100)",
    "SPY": "SPDR S&P 500 ETF Trust",
    "IVV": "iShares Core S&P 500 ETF",
    "SCHD": "Schwab U.S. Dividend Equity ETF",
    "KO": "The Coca-Cola Company",
    "JNJ": "Johnson & Johnson",
    "BRK.B": "Berkshire Hathaway Inc.",
    "AMD": "Advanced Micro Devices Inc.",
    "BND": "Vanguard Total Bond Market ETF",
}


@dataclass
class StockPosition:
    ticker: str
    shares: float
    avg_cost_usd: float = 0.0
    current_price_usd: float = 0.0
    company_name: Optional[str] = None
    broker: str = "Avenue"
    currency: str = "USD"
    notes: Optional[str] = None
    last_updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def __post_init__(self):
        self.ticker = self.ticker.upper().strip()
        if not self.company_name:
            self.company_name = COMPANY_NAMES.get(self.ticker, f"{self.ticker} Inc.")
        if self.current_price_usd <= 0:
            self.current_price_usd = BENCHMARK_US_PRICES.get(self.ticker, self.avg_cost_usd or 100.0)

    @property
    def total_usd(self) -> float:
        return round(self.shares * self.current_price_usd, 2)

    @property
    def total_cost_usd(self) -> float:
        return round(self.shares * self.avg_cost_usd, 2) if self.avg_cost_usd > 0 else self.total_usd

    @property
    def unrealized_pnl_usd(self) -> float:
        if self.avg_cost_usd <= 0:
            return 0.0
        return round(self.total_usd - self.total_cost_usd, 2)

    @property
    def unrealized_pnl_pct(self) -> float:
        if self.avg_cost_usd <= 0:
            return 0.0
        return round(((self.current_price_usd - self.avg_cost_usd) / self.avg_cost_usd) * 100.0, 2)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["total_usd"] = self.total_usd
        d["total_cost_usd"] = self.total_cost_usd
        d["unrealized_pnl_usd"] = self.unrealized_pnl_usd
        d["unrealized_pnl_pct"] = self.unrealized_pnl_pct
        d["formatted_total_usd"] = f"US$ {self.total_usd:,.2f}"
        return d


@dataclass
class USPortfolioSummary:
    total_usd: float
    total_brl: float
    ptax_rate: float
    positions_count: int
    positions: List[StockPosition]
    broker_breakdown: Dict[str, float] = field(default_factory=dict)
    cbe_required: bool = False
    cbe_status: str = "Isento"
    last_updated: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_usd": round(self.total_usd, 2),
            "total_brl": round(self.total_brl, 2),
            "ptax_rate": round(self.ptax_rate, 4),
            "formatted_total_usd": f"US$ {self.total_usd:,.2f}",
            "formatted_total_brl": f"R$ {self.total_brl:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "positions_count": self.positions_count,
            "broker_breakdown": self.broker_breakdown,
            "cbe_required": self.cbe_required,
            "cbe_status": self.cbe_status,
            "last_updated": self.last_updated,
            "positions": [p.to_dict() for p in self.positions],
        }
