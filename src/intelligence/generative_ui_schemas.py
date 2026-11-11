"""Generative UI Schemas for OpenFamilyOffice (Phase 1).

Defines Pydantic models and serialization protocols for interactive,
client-rendered generative financial calculators and decision artifacts.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ArtifactType(str, Enum):
    COMPOUND_INTEREST = "compound_interest"
    PURCHASE_OPPORTUNITY = "purchase_opportunity"
    REAL_VS_NOMINAL = "real_vs_nominal"
    MORTGAGE_VS_RENT = "mortgage_vs_rent"


class CompoundInterestPayload(BaseModel):
    initial_principal: float = Field(default=5000.0, description="Aporte inicial em reais ou moeda base")
    monthly_deposit: float = Field(default=500.0, description="Aporte mensal recorrente")
    annual_rate_percent: float = Field(default=11.25, description="Taxa de juros anual projetada (%)")
    years: int = Field(default=15, description="Horizonte de tempo em anos")
    currency_prefix: str = Field(default="R$", description="Prefixo monetário (R$, US$, etc.)")
    series: Optional[List[Dict[str, Any]]] = Field(default=None, description="Série calculada ano a ano")


class PurchaseOpportunityPayload(BaseModel):
    item_name: str = Field(default="Novo Item", description="Nome do bem de consumo ou investimento pretendido")
    cash_price: float = Field(default=5000.0, description="Preço à vista com eventuais descontos")
    installments_count: int = Field(default=12, description="Número de parcelas sem juros aparentes")
    installment_value: float = Field(default=0.0, description="Valor de cada parcela")
    benchmark_annual_rate: float = Field(default=11.25, description="Taxa CDI / Selic de referência para custo de oportunidade (%)")
    cooling_off_days_suggested: int = Field(default=14, description="Janela de reflexão comportamental sugerida (dias)")
    family_monthly_income: float = Field(default=15000.0, description="Renda mensal líquida familiar de referência")


class RealVsNominalPayload(BaseModel):
    nominal_rate_percent: float = Field(default=12.0, description="Taxa nominal contratada do investimento (%)")
    inflation_annual_percent: float = Field(default=4.5, description="Taxa de inflação oficial projetada IPCA (%)")
    income_tax_percent: float = Field(default=15.0, description="Alíquota de imposto de renda incidente (15% a 22.5% ou 0% isento)")
    real_rate_percent: Optional[float] = Field(default=None, description="Rentabilidade real líquida calculada via Equação de Fisher (%)")


class MortgageVsRentPayload(BaseModel):
    property_value: float = Field(default=500000.0, description="Valor venal de mercado do imóvel")
    down_payment: float = Field(default=100000.0, description="Valor da entrada")
    mortgage_interest_annual: float = Field(default=9.5, description="Taxa de juros do financiamento anual (%)")
    monthly_rent: float = Field(default=2500.0, description="Custo mensal de aluguel alternativo equivalente")
    years: int = Field(default=30, description="Prazo em anos do financiamento")


class InteractiveArtifact(BaseModel):
    id: str = Field(default_factory=lambda: f"ART-{uuid.uuid4().hex[:8].upper()}")
    artifact_type: ArtifactType = Field(..., description="Tipo do componente interativo a ser renderizado")
    title: str = Field(..., description="Título de cabeçalho do card interativo")
    description: Optional[str] = Field(default="", description="Descrição curta ou veredito inicial")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    payload: Dict[str, Any] = Field(default_factory=dict, description="Dados parametrizados para os controles do card")

