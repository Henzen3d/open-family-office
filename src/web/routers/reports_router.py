"""Financial Reports, MEI Ceilings, and Multi-Entity Liquidity Router."""
from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import APIRouter, Query

from src.web.deps import get_reports_manager

router = APIRouter(tags=["reports"])


@router.get("/api/reports/mei-status")
@router.get("/reports/mei-status")
@router.get("/api/reports/mei-ceiling")
@router.get("/reports/mei-ceiling")
@router.get("/api/statements/mei-ceiling")
@router.get("/statements/mei-ceiling")
async def get_mei_ceiling_status(
    year: int = Query(default=2026, description="Ano fiscal para verificação do teto MEI (Art. 14 LC 123/2006)"),
) -> Dict[str, Any]:
    """Calculates actual revenue from transactions.csv for FIX_SERVICOS and FACILITA_VISTORIAS.

    Returns:
    - R$ 81,000.00 annual ceiling per MEI CNPJ
    - Percentage of ceiling utilized
    - Remaining ceiling margin (R$)
    - Monthly run rate / average pace
    - Monthly runway (months remaining before ceiling exhaustion)
    - 20% tolerance threshold (R$ 97,200.00) under Art. 14, §§ 1º e 2º of LC 123/2006
    - Status and compliance warnings (SAFE, CAUTION_80, EXCEEDED_CEILING, EXCEEDED_20_PERCENT)
    - Conjugal segregation status (Osmar / Fix Serviços vs Vera / Facilita Vistorias)
    """
    mgr = get_reports_manager()
    return mgr.calculate_mei_status(year=year)


@router.get("/api/reports/liquidity")
@router.get("/reports/liquidity")
async def get_liquidity_report() -> Dict[str, Any]:
    """Calculates multi-entity real cash liquidity and global consolidated net worth.

    Returns:
    - Total cash balance across active bank accounts (BRL)
    - Per-entity liquid breakdown (HOUSEHOLD_OSMAR, FIX_SERVICOS, FACILITA_VISTORIAS)
    - Percentage share of total liquidity per entity
    - US stocks portfolio summary (Avenue) converted via official PTAX rate
    - Consolidated global net worth (Liquid Cash BRL + US Stocks BRL)
    """
    mgr = get_reports_manager()
    return mgr.get_liquidity_report()
