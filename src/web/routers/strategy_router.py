"""OpenFamilyOffice — Strategy Hub Router.
API endpoints for proactive opportunity scanning, asset purchase simulators, and multi-school economic council.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.engine.strategy_engine import (
    CarTCOCalculator,
    GadgetPurchaseCalculator,
    MortgageVsRentCalculator,
    MultiSchoolAdvisoryEvaluator,
    OpportunityScanner,
)
from src.web.deps import get_data_dir, get_ledger_manager

router = APIRouter(tags=["strategy"])


class CarSimulationRequest(BaseModel):
    car_value: float = Field(..., gt=0, description="Valor venal de compra do veículo (R$)")
    down_payment: float = Field(default=0.0, ge=0, description="Valor da entrada inicial (R$)")
    loan_months: int = Field(default=48, ge=1, le=120, description="Prazo do financiamento em meses")
    loan_annual_rate: float = Field(default=16.5, ge=0, description="Taxa de juros do financiamento (% a.a.)")
    monthly_km: float = Field(default=1200.0, ge=0, description="Quilometragem média rodada por mês")
    km_per_liter: float = Field(default=11.5, gt=0, description="Consumo médio do veículo (km/l)")
    fuel_price_liter: float = Field(default=5.89, gt=0, description="Preço do combustível por litro (R$)")
    annual_insurance: float = Field(default=4200.0, ge=0, description="Custo anual do seguro automotivo (R$)")
    annual_ipva_rate: float = Field(default=0.04, ge=0, le=0.10, description="Alíquota do IPVA (ex: 0.04 = 4%)")
    annual_maintenance_rate: float = Field(default=0.03, ge=0, le=0.15, description="Manutenção anual estimada (% do veículo)")
    annual_depreciation_rate: float = Field(default=0.10, ge=0, le=0.30, description="Depreciação anual estimada (% FIPE)")
    benchmark_annual_rate: float = Field(default=11.25, ge=0, description="Taxa CDI/Selic de referência para custo de oportunidade")


class RealEstateSimulationRequest(BaseModel):
    property_value: float = Field(..., gt=0, description="Valor do imóvel (R$)")
    down_payment: float = Field(..., ge=0, description="Valor da entrada inicial (R$)")
    loan_years: int = Field(default=30, ge=1, le=40, description="Prazo em anos do financiamento")
    loan_annual_rate: float = Field(default=10.5, ge=0, description="Taxa de juros anual do financiamento (% a.a.)")
    monthly_rent: float = Field(default=2800.0, ge=0, description="Aluguel mensal de imóvel similar (R$)")
    annual_property_appreciation: float = Field(default=5.0, description="Valorização anual estimada do imóvel (% a.a.)")
    annual_portfolio_yield: float = Field(default=10.5, description="Rentabilidade bruta da carteira de investimentos (% a.a.)")
    annual_inflation: float = Field(default=4.5, description="Inflação anual projetada para reajuste de aluguel (% a.a.)")


class GadgetSimulationRequest(BaseModel):
    item_name: str = Field(..., min_length=2, description="Nome do produto (ex: iPhone 16 Pro)")
    cash_price: float = Field(..., gt=0, description="Preço à vista (R$)")
    cash_discount_percent: float = Field(default=10.0, ge=0, le=50, description="Desconto para pagamento à vista (%)")
    installments_count: int = Field(default=12, ge=1, le=36, description="Número de parcelas sem juros")
    benchmark_annual_rate: float = Field(default=11.25, ge=0, description="Taxa CDI/Selic para cálculo de custo de oportunidade")
    family_monthly_income: float = Field(default=15000.0, ge=0, description="Renda mensal líquida da família para cálculo de horas")


class AdvisoryCouncilRequest(BaseModel):
    topic: str = Field(..., min_length=3, description="Descrição da decisão ou projeto financeiro familiar")
    amount: float = Field(..., ge=0, description="Montante financeiro envolvido na decisão (R$)")
    context: Optional[str] = Field(default=None, description="Contexto adicional da família")


@router.get("/api/strategy/opportunities")
@router.get("/strategy/opportunities")
async def get_strategy_opportunities():
    """Returns active proactive radar alerts based on real account balances and ledger data."""
    data_dir = get_data_dir()
    accounts_file = data_dir / "accounts" / "accounts.json"

    accounts: List[Dict[str, Any]] = []
    if accounts_file.exists():
        try:
            with open(accounts_file, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
                accounts = raw_data.get("accounts", [])
        except Exception:
            accounts = []

    ledger_manager = get_ledger_manager()
    transactions = ledger_manager.load_transactions()
    tx_dicts = [t.model_dump() if hasattr(t, "model_dump") else (t.__dict__ if hasattr(t, "__dict__") else {}) for t in transactions]

    # Calculate year-to-date MEI revenues from actual transactions
    from datetime import datetime, timezone
    current_year = datetime.now(timezone.utc).year
    rev_fix = sum(
        float(t.amount)
        for t in transactions
        if (getattr(t, "entity_code", "") or "").upper() == "FIX_SERVICOS"
        and float(t.amount) > 0
        and not getattr(t, "is_transfer", False)
        and getattr(t.date, "year", current_year) == current_year
    )
    rev_facilita = sum(
        float(t.amount)
        for t in transactions
        if (getattr(t, "entity_code", "") or "").upper() == "FACILITA_VISTORIAS"
        and float(t.amount) > 0
        and not getattr(t, "is_transfer", False)
        and getattr(t.date, "year", current_year) == current_year
    )

    # Sensible defaults if ledger is nascent
    if rev_fix == 0:
        rev_fix = 64800.0
    if rev_facilita == 0:
        rev_facilita = 29400.0

    radar = OpportunityScanner.get_consolidated_radar(
        accounts=accounts,
        transactions=tx_dicts,
        revenue_fix=rev_fix,
        revenue_facilita=rev_facilita,
        selic_rate=11.25,
    )
    return radar


@router.post("/api/strategy/simulate/car")
@router.post("/strategy/simulate/car")
async def simulate_car(request: CarSimulationRequest):
    """Calculates True Total Cost of Ownership (TCO) for a vehicle."""
    result = CarTCOCalculator.calculate(
        car_value=request.car_value,
        down_payment=request.down_payment,
        loan_months=request.loan_months,
        loan_annual_rate=request.loan_annual_rate,
        monthly_km=request.monthly_km,
        km_per_liter=request.km_per_liter,
        fuel_price_liter=request.fuel_price_liter,
        annual_insurance=request.annual_insurance,
        annual_ipva_rate=request.annual_ipva_rate,
        annual_maintenance_rate=request.annual_maintenance_rate,
        annual_depreciation_rate=request.annual_depreciation_rate,
        benchmark_annual_rate=request.benchmark_annual_rate,
    )
    return result


@router.post("/api/strategy/simulate/real-estate")
@router.post("/strategy/simulate/real-estate")
async def simulate_real_estate(request: RealEstateSimulationRequest):
    """Calculates 30-year wealth trajectories for Buying vs Renting and Investing."""
    result = MortgageVsRentCalculator.calculate(
        property_value=request.property_value,
        down_payment=request.down_payment,
        loan_years=request.loan_years,
        loan_annual_rate=request.loan_annual_rate,
        monthly_rent=request.monthly_rent,
        annual_property_appreciation=request.annual_property_appreciation,
        annual_portfolio_yield=request.annual_portfolio_yield,
        annual_inflation=request.annual_inflation,
    )
    return result


@router.post("/api/strategy/simulate/gadget")
@router.post("/strategy/simulate/gadget")
async def simulate_gadget(request: GadgetSimulationRequest):
    """Calculates Cash vs Credit Card Installments + Opportunity Cost."""
    result = GadgetPurchaseCalculator.calculate(
        item_name=request.item_name,
        cash_price=request.cash_price,
        cash_discount_percent=request.cash_discount_percent,
        installments_count=request.installments_count,
        benchmark_annual_rate=request.benchmark_annual_rate,
        family_monthly_income=request.family_monthly_income,
    )
    return result


@router.post("/api/strategy/advisory-council")
@router.post("/strategy/advisory-council")
async def consult_advisory_council(request: AdvisoryCouncilRequest):
    """Provides structured strategic advice from the 5 economic schools."""
    result = MultiSchoolAdvisoryEvaluator.evaluate(
        topic=request.topic,
        amount=request.amount,
        context=request.context,
    )
    return result
