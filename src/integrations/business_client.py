"""Business & Corporate Intelligence Client using BrasilAPI (100% Free, Zero Auth)."""
from dataclasses import dataclass, field
from decimal import Decimal
import json
import re
from typing import Dict, List, Optional
import urllib.request


@dataclass
class PartnerProfile:
    """Partner or administrator in the corporate structure (QSA)."""
    nome_socio: str
    qualificacao_socio: str
    faixa_etaria: Optional[str] = None


@dataclass
class CompanyProfile:
    """Official corporate registration data from Receita Federal via BrasilAPI."""
    cnpj: str
    razao_social: str
    nome_fantasia: str
    situacao_cadastral: str  # "ATIVA", "BAIXADA", "SUSPENSA", "INAPTA"
    data_inicio_atividade: str
    cnae_descricao: str
    capital_social: Decimal
    municipio: str
    uf: str
    qsa: List[PartnerProfile] = field(default_factory=list)
    raw_response: dict = field(default_factory=dict)

    @property
    def is_active(self) -> bool:
        """Returns True if the company is in regular active standing with Receita Federal."""
        return "ATIVA" in self.situacao_cadastral.upper()


class BusinessClient:
    """Verifies client, vendor, and entity legal standing using public federal registries."""

    BRASIL_API_CNPJ_URL = "https://brasilapi.com.br/api/cnpj/v1/{cnpj}"

    def __init__(self, timeout: int = 6):
        self.timeout = timeout

    @staticmethod
    def sanitize_cnpj(cnpj_str: str) -> str:
        """Removes punctuation and spaces from CNPJ string."""
        return re.sub(r"\D", "", cnpj_str)

    def lookup_cnpj(self, cnpj_raw: str) -> Optional[CompanyProfile]:
        """Consults official federal registration data for a given CNPJ."""
        clean_cnpj = self.sanitize_cnpj(cnpj_raw)
        if len(clean_cnpj) != 14:
            raise ValueError(f"Invalid CNPJ length ({len(clean_cnpj)} digits). Expected 14 numeric digits.")

        url = self.BRASIL_API_CNPJ_URL.format(cnpj=clean_cnpj)

        try:
            req = urllib.request.Request(url, headers={"User-Agent": "OpenFamilyOffice/1.0"})
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                
                # Parse partners (QSA)
                partners = []
                for p in data.get("qsa", []):
                    partners.append(
                        PartnerProfile(
                            nome_socio=p.get("nome_socio", "").strip(),
                            qualificacao_socio=p.get("qualificacao_socio", "").strip(),
                            faixa_etaria=p.get("faixa_etaria"),
                        )
                    )

                cap_str = str(data.get("capital_social", "0.00")).replace(",", ".")
                capital = Decimal(cap_str)

                return CompanyProfile(
                    cnpj=clean_cnpj,
                    razao_social=data.get("razao_social", "").strip(),
                    nome_fantasia=data.get("nome_fantasia", "").strip() or data.get("razao_social", "").strip(),
                    situacao_cadastral=data.get("descricao_situacao_cadastral", "DESCONHECIDA").strip(),
                    data_inicio_atividade=data.get("data_inicio_atividade", ""),
                    cnae_descricao=data.get("cnae_fiscal_descricao", ""),
                    capital_social=capital,
                    municipio=data.get("municipio", ""),
                    uf=data.get("uf", ""),
                    qsa=partners,
                    raw_response=data,
                )
        except Exception as e:
            print(f"Warning: Failed to lookup CNPJ {clean_cnpj}: {e}")
            return None

