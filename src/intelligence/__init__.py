"""Intelligence package: BCB client, economic news, and macro aggregation."""
from src.intelligence.bcb_client import BCBClient
from src.intelligence.news_rss import EconomicNewsClient
from src.intelligence.macro_aggregator import MacroAggregator

__all__ = [
    "BCBClient",
    "EconomicNewsClient",
    "MacroAggregator",
]

