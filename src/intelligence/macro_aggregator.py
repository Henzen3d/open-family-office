"""Macroeconomic Aggregator and Local Caching Engine."""
from datetime import date
from decimal import Decimal
import json
import os
from typing import Optional

from src.models.reports import EconomicRate, NewsHeadline, MacroSnapshot
from src.intelligence.bcb_client import BCBClient
from src.intelligence.news_rss import EconomicNewsClient


class MacroAggregator:
    """Aggregates official Central Bank rates and economic headlines, managing a local daily cache."""

    def __init__(self, cache_dir: str = "data/macro_cache"):
        self.cache_dir = cache_dir
        self.bcb_client = BCBClient()
        self.news_client = EconomicNewsClient()

    def _get_cache_filepath(self, today_date: str) -> str:
        return os.path.join(self.cache_dir, f"macro_snapshot_{today_date}.json")

    def get_daily_snapshot(self, force_refresh: bool = False) -> MacroSnapshot:
        """Retrieves today's macro snapshot from cache or fetches from public APIs."""
        today_str = date.today().isoformat()
        cache_path = self._get_cache_filepath(today_str)

        # Check local cache first
        if not force_refresh and os.path.exists(cache_path):
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                    rates = {}
                    for k, r in raw.get("rates", {}).items():
                        rates[k] = EconomicRate(
                            indicator_code=r["indicator_code"],
                            name=r["name"],
                            value=Decimal(str(r["value"])),
                            reference_date=r["reference_date"],
                            source=r["source"],
                        )
                    headlines = [
                        NewsHeadline(
                            title=h["title"],
                            source_name=h["source_name"],
                            published_at=h["published_at"],
                            link=h["link"],
                            relevant_keywords=h.get("relevant_keywords", []),
                        )
                        for h in raw.get("top_headlines", [])
                    ]
                    return MacroSnapshot(
                        snapshot_date=raw["snapshot_date"],
                        rates=rates,
                        top_headlines=headlines,
                        cached=True,
                    )
            except Exception:
                pass

        # Fetch fresh data from public sources
        rates = self.bcb_client.fetch_all_rates()
        headlines = self.news_client.fetch_top_headlines(limit=5)

        snapshot = MacroSnapshot(
            snapshot_date=today_str,
            rates=rates,
            top_headlines=headlines,
            cached=False,
        )

        # Save to local cache
        try:
            os.makedirs(self.cache_dir, exist_ok=True)
            serializable = {
                "snapshot_date": snapshot.snapshot_date,
                "rates": {
                    k: {
                        "indicator_code": r.indicator_code,
                        "name": r.name,
                        "value": float(r.value),
                        "reference_date": r.reference_date,
                        "source": r.source,
                    }
                    for k, r in snapshot.rates.items()
                },
                "top_headlines": [
                    {
                        "title": h.title,
                        "source_name": h.source_name,
                        "published_at": h.published_at,
                        "link": h.link,
                        "relevant_keywords": h.relevant_keywords,
                    }
                    for h in snapshot.top_headlines
                ],
            }
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(serializable, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

        return snapshot

    def render_markdown_context(self, snapshot: MacroSnapshot) -> str:
        """Formats the macro snapshot into a clean Markdown block for LLM prompt grounding."""
        lines = ["### Live Macroeconomic Context (Grounded Real-Time Data)"]
        for k, r in snapshot.rates.items():
            lines.append(f"- **{r.name}**: {r.value}% ({r.reference_date})" if "IPCA" in k or "SELIC" in k else f"- **{r.name}**: R$ {r.value:,.4f} ({r.reference_date})")

        lines.append("\n**Top Economic Headlines (Past 24h)**:")
        for idx, h in enumerate(snapshot.top_headlines, 1):
            lines.append(f"{idx}. {h.title} *({h.source_name})*")

        return "\n".join(lines)

