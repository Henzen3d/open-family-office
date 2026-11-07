"""Economic News RSS Ingestion and Financial Filtering."""
import html
from typing import List
import urllib.request
import xml.etree.ElementTree as ET

from src.models.reports import NewsHeadline


class EconomicNewsClient:
    """Fetches and filters economic headlines from free public financial RSS feeds."""

    DEFAULT_RSS_URL = "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=pt-BR&gl=BR&ceid=BR:pt-419"

    FINANCIAL_KEYWORDS = [
        "dólar", "dolar", "câmbio", "cambio", "selic", "juros", "copom",
        "inflação", "inflacao", "ipca", "ibovespa", "ações", "acoes", "bolsa",
        "mercado", "mei", "simples nacional", "receita federal", "fed", "banco central"
    ]

    def __init__(self, rss_url: str = None, timeout: int = 5):
        self.rss_url = rss_url or self.DEFAULT_RSS_URL
        self.timeout = timeout

    def fetch_top_headlines(self, limit: int = 5) -> List[NewsHeadline]:
        """Fetches and returns the top filtered economic headlines."""
        headlines: List[NewsHeadline] = []

        try:
            req = urllib.request.Request(self.rss_url, headers={"User-Agent": "Mozilla/5.0 (OpenFamilyOffice/1.0)"})
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                xml_data = resp.read()
                root = ET.fromstring(xml_data)
                items = root.findall("./channel/item")

                for item in items:
                    title_elem = item.find("title")
                    link_elem = item.find("link")
                    pub_date_elem = item.find("pubDate")
                    source_elem = item.find("source")

                    if title_elem is not None and title_elem.text:
                        raw_title = html.unescape(title_elem.text.strip())
                        link = link_elem.text.strip() if link_elem is not None and link_elem.text else ""
                        pub_date = pub_date_elem.text.strip() if pub_date_elem is not None and pub_date_elem.text else ""
                        source = source_elem.text.strip() if source_elem is not None and source_elem.text else "Notícias Econômicas"

                        title_lower = raw_title.lower()
                        matched_kw = [kw for kw in self.FINANCIAL_KEYWORDS if kw in title_lower]

                        if matched_kw:
                            headlines.append(
                                NewsHeadline(
                                    title=raw_title,
                                    source_name=source,
                                    published_at=pub_date,
                                    link=link,
                                    relevant_keywords=matched_kw,
                                )
                            )
                            if len(headlines) >= limit:
                                break
        except Exception:
            # Fallback if network fails
            headlines.append(
                NewsHeadline(
                    title="Atenção ao cenário macroeconômico e juros Selic no Brasil.",
                    source_name="OpenFamilyOffice Fallback",
                    published_at="Hoje",
                    link="",
                    relevant_keywords=["selic", "economia"],
                )
            )

        return headlines
