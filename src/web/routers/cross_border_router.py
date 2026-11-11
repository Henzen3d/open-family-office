"""OpenFamilyOffice — Cross-Border and Multi-Currency Router.
API endpoints for PTAX exchange rates, remittance calculators, US tax advantaged accounts,
and international fiscal compliance (W-8BEN, CBE Bacen, Carnê-Leão).
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

from src.engine.forex_cross_border_engine import (
    CbeBacenMonitor,
    PtaxRateService,
    RemittanceCalculator,
)
from src.engine.us_tax_engine import (
    ScheduleDClassifier,
    TaxAdvantagedAccountsTracker,
    W8BenMonitor,
)
from src.web.deps import get_data_dir

router = APIRouter(tags=["cross_border"])


class ConvertRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Montante a ser convertido")
    from_currency: str = Field(default="BRL", description="Moeda de origem (BRL, USD, EUR)")
    to_currency: str = Field(default="USD", description="Moeda de destino (BRL, USD, EUR)")
    custom_rate: Optional[float] = Field(default=None, description="Taxa manual opcional")


class RemittanceRequest(BaseModel):
    amount_brl: float = Field(..., gt=0, description="Montante em reais para remessa")
    purpose: str = Field(default="same_ownership", description="same_ownership (1.1% IOF) ou investment (0.38% IOF)")
    ptax_usd: Optional[float] = Field(default=None, description="Cotação PTAX de referência")


class ScheduleDRequest(BaseModel):
    asset_symbol: str = Field(..., description="Ticker do ativo (ex: AAPL, SPY)")
    purchase_date: str = Field(..., description="Data de compra (YYYY-MM-DD)")
    sale_date: str = Field(..., description="Data de venda (YYYY-MM-DD)")
    purchase_price: float = Field(..., gt=0, description="Preço de aquisição por cota (USD)")
    sale_price: float = Field(..., gt=0, description="Preço de venda por cota (USD)")
    quantity: float = Field(default=1.0, gt=0, description="Quantidade de cotas vendidas")


@router.get("/api/forex/overview")
@router.get("/forex/overview")
async def get_forex_overview():
    """Returns official PTAX and commercial quotes with daily variation."""
    data_dir = get_data_dir()
    cache_dir = data_dir / "macro_cache"
    return PtaxRateService.get_rates(cache_dir=cache_dir)


@router.post("/api/forex/convert")
@router.post("/forex/convert")
async def convert_currency(request: ConvertRequest):
    """Converts amounts between BRL, USD, and EUR."""
    return PtaxRateService.convert(
        amount=request.amount,
        from_curr=request.from_currency,
        to_curr=request.to_currency,
        custom_rate=request.custom_rate,
    )


@router.post("/api/forex/remittance")
@router.post("/forex/remittance")
async def calculate_remittance(request: RemittanceRequest):
    """Calculates and ranks international remittance providers with IOF and spreads."""
    ptax = request.ptax_usd or 5.82
    return RemittanceCalculator.calculate(
        amount_brl=request.amount_brl,
        purpose=request.purpose,
        ptax_usd=ptax,
    )


@router.get("/api/cross-border/compliance")
@router.get("/cross-border/compliance")
async def get_cross_border_compliance():
    """Returns multi-jurisdiction compliance status: W-8BEN, Carnê-Leão, and CBE Bacen."""
    # Assuming family holds ~$34,500 in foreign brokerages (Nomad, Avenue)
    total_foreign_usd = 34500.0
    cbe_status = CbeBacenMonitor.check_threshold(total_foreign_assets_usd=total_foreign_usd)
    w8ben_status = W8BenMonitor.check_status(signed_date_str="2024-04-10")

    return {
        "status": "compliant",
        "w8ben": w8ben_status,
        "cbe_bacen": cbe_status,
        "carne_leao": {
            "status": "Sem pendências no mês",
            "last_darf_paid": "R$ 0,00",
            "note": "Receitas do exterior convertidas pelo dólar PTAX compra na data do recebimento.",
        },
    }


@router.get("/api/us-tax/overview")
@router.get("/us-tax/overview")
async def get_us_tax_overview():
    """Returns US Tax-Advantaged accounts tracking (401k, Roth IRA, HSA)."""
    return TaxAdvantagedAccountsTracker.evaluate_contributions(
        contributed_401k=14500.0,
        contributed_ira=7000.0,
        contributed_hsa=4300.0,
        age=42,
        is_family_hsa=True,
    )


@router.post("/api/us-tax/schedule-d")
@router.post("/us-tax/schedule-d")
async def classify_schedule_d(request: ScheduleDRequest):
    """Classifies capital gains into Short-Term or Long-Term for IRS Form 1040 Schedule D."""
    return ScheduleDClassifier.classify(
        asset_symbol=request.asset_symbol,
        purchase_date_str=request.purchase_date,
        sale_date_str=request.sale_date,
        purchase_price=request.purchase_price,
        sale_price=request.sale_price,
        quantity=request.quantity,
    )

