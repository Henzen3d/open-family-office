"""Web Research & Public Financial Data Service with Strict Security Guard.

Enforces:
1. SSRF prevention and URL validation (web_guard)
2. Outbound PII and internal context scrub (PIISanitizer target="web_search")
3. Official sources prioritization (Banco Central do Brasil, Receita Federal, IBGE, Portal do Empreendedor)
4. Structured citations with reference and consultation dates
5. Offline / local-only fallback resilience
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import json
import re
from typing import Any, Dict, List, Optional
import urllib.request
import urllib.error

from src.security.web_guard import validate_url_safety, SecuritySSRFException
from src.security.sanitizer import PIISanitizer


@dataclass
class SearchCitation:
    title: str
    url: str
    snippet: str
    source_name: str
    reference_date: Optional[str] = None
    consulted_at: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        if not d["consulted_at"]:
            d["consulted_at"] = datetime.now(timezone.utc).isoformat()
        return d


class WebResearchService:
    """Safely executes public economic research with SSRF guard and citation tracking."""

    OFFICIAL_KNOWLEDGE_BASE = {
        "copom": {
            "title": "Decisões do Copom e Histórico das Taxas de Juros",
            "url": "https://www.bcb.gov.br/controleinflacao/historicotaxasjuros",
            "source_name": "Banco Central do Brasil",
            "snippet": (
                "O Comitê de Política Monetária (Copom) do Banco Central do Brasil define a meta da taxa Selic. "
                "Decisões recentes mantiveram a política monetária austera para ancoragem das expectativas de inflação."
            ),
            "reference_date": "2026-11",
        },
        "selic": {
            "title": "Taxa Selic Meta — Banco Central do Brasil",
            "url": "https://www.bcb.gov.br/controleinflacao/taxaselic",
            "source_name": "Banco Central do Brasil",
            "snippet": "A taxa Selic é a taxa básica de juros da economia brasileira, fixada periodicamente pelo Copom.",
            "reference_date": "2026-11",
        },
        "ptax": {
            "title": "Cotações do Dólar PTAX — Banco Central do Brasil",
            "url": "https://www.bcb.gov.br/estabilidadefinanceira/historicocotacoes",
            "source_name": "Banco Central do Brasil",
            "snippet": "Cotação oficial de fechamento calculada e divulgada pelo Banco Central do Brasil.",
            "reference_date": "2026-11",
        },
        "ipca": {
            "title": "Índice Nacional de Preços ao Consumidor Amplo (IPCA)",
            "url": "https://www.ibge.gov.br/estatisticas/economicas/precos-e-custos/9256-indice-nacional-de-precos-ao-consumidor-amplo.html",
            "source_name": "IBGE",
            "snippet": "O IPCA mede a variação de preços da cesta de consumo para famílias com rendimento de 1 a 40 salários mínimos.",
            "reference_date": "2026-10",
        },
        "teto_mei": {
            "title": "Regras do Microempreendedor Individual (MEI) e Limite Anual",
            "url": "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor",
            "source_name": "Portal do Empreendedor / Receita Federal",
            "snippet": (
                "O limite anual de faturamento para o Microempreendedor Individual (MEI) sob a Lei Complementar 123/2006 "
                "é de R$ 81.000,00 anuais (ou R$ 6.750,00 proporcionais ao mês). Desenquadramento ocorre ao ultrapassar o teto."
            ),
            "reference_date": "2026",
        },
        "distribuicao_lucros": {
            "title": "Distribuição Isenta de Lucros do MEI — Artigo 14 da LC 123/2006",
            "url": "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/dirpf",
            "source_name": "Receita Federal do Brasil",
            "snippet": (
                "Com escrituração contábil regular ou aplicando os percentuais de presunção (8% comércio, 32% serviços), "
                "o lucro transferido da pessoa jurídica MEI para a pessoa física do titular é 100% isento de IRPF."
            ),
            "reference_date": "2026",
        },
    }

    def __init__(
        self,
        sanitizer: Optional[PIISanitizer] = None,
        timeout: int = 6,
        max_response_bytes: int = 524288,  # 512 KB
    ):
        self.sanitizer = sanitizer or PIISanitizer()
        self.timeout = timeout
        self.max_response_bytes = max_response_bytes

    def sanitize_query(self, raw_query: str) -> str:
        """Strips private financial data, entity identifiers and personal names."""
        return self.sanitizer.sanitize_search_query(raw_query)

    def search_public_web(
        self,
        query: str,
        max_results: int = 3,
        force_official: bool = True,
    ) -> List[SearchCitation]:
        """Executes a strictly protected public search, prioritizing official authorities.

        Ensures:
        - Query is scrubbed of all private context
        - All URLs pass SSRF verification before inclusion
        - Official sources (BCB, Receita, IBGE) are cited when relevant
        """
        clean_query = self.sanitize_query(query).lower()
        now_iso = datetime.now(timezone.utc).isoformat()
        results: List[SearchCitation] = []

        # 1. Check official curated knowledge base
        for key, entry in self.OFFICIAL_KNOWLEDGE_BASE.items():
            if key in clean_query or any(w in clean_query for w in key.split("_")):
                # Verify URL safety through SSRF guard
                safe_url = validate_url_safety(entry["url"])
                results.append(
                    SearchCitation(
                        title=entry["title"],
                        url=safe_url,
                        snippet=entry["snippet"],
                        source_name=entry["source_name"],
                        reference_date=entry["reference_date"],
                        consulted_at=now_iso,
                    )
                )

        # Copom / Central Bank query matching
        if any(w in clean_query for w in ["copom", "banco central", "decisão", "decisao", "juros", "selic"]):
            if not any(r.source_name == "Banco Central do Brasil" for r in results):
                bcb_entry = self.OFFICIAL_KNOWLEDGE_BASE["copom"]
                results.append(
                    SearchCitation(
                        title=bcb_entry["title"],
                        url=validate_url_safety(bcb_entry["url"]),
                        snippet=bcb_entry["snippet"],
                        source_name=bcb_entry["source_name"],
                        reference_date=bcb_entry["reference_date"],
                        consulted_at=now_iso,
                    )
                )

        # MEI / Receita query matching
        if any(w in clean_query for w in ["teto", "mei", "faturamento", "receita federal", "simples"]):
            if not any("Receita Federal" in r.source_name or "Portal do Empreendedor" in r.source_name for r in results):
                mei_entry = self.OFFICIAL_KNOWLEDGE_BASE["teto_mei"]
                results.append(
                    SearchCitation(
                        title=mei_entry["title"],
                        url=validate_url_safety(mei_entry["url"]),
                        snippet=mei_entry["snippet"],
                        source_name=mei_entry["source_name"],
                        reference_date=mei_entry["reference_date"],
                        consulted_at=now_iso,
                    )
                )

        # 2. Try DuckDuckGo Instant Answer API for general public economic facts
        if len(results) < max_results and clean_query.strip():
            try:
                encoded_q = urllib.parse.quote_plus(clean_query)
                ddg_url = f"https://api.duckduckgo.com/?q={encoded_q}&format=json&no_html=1&skip_disambig=1"
                safe_ddg_url = validate_url_safety(ddg_url)

                req = urllib.request.Request(
                    safe_ddg_url,
                    headers={"User-Agent": "OpenFamilyOffice/1.0 (Public Research)"},
                )
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    raw_data = resp.read(self.max_response_bytes).decode("utf-8", errors="ignore")
                    parsed = json.loads(raw_data)
                    abstract = parsed.get("AbstractText")
                    source = parsed.get("AbstractSource", "Informação Pública")
                    abs_url = parsed.get("AbstractURL")

                    if abstract and abs_url:
                        safe_abs_url = validate_url_safety(abs_url)
                        results.append(
                            SearchCitation(
                                title=parsed.get("Heading", clean_query.title()),
                                url=safe_abs_url,
                                snippet=abstract,
                                source_name=source,
                                reference_date=datetime.now(timezone.utc).strftime("%Y-%m"),
                                consulted_at=now_iso,
                            )
                        )
            except Exception:
                # Resilient fallback: public network error does not break assistant
                pass

        return results[:max_results]
