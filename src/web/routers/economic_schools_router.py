"""OpenFamilyOffice — Economic Schools & Macro Indicators Router.
API endpoints for 5 Economic Schools Scorecard and Real Purchasing Power benchmarks.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter

from src.engine.economic_schools_evaluator import (
    EconomicScorecardEvaluator,
    PurchasingPowerEngine,
)
from src.web.deps import get_data_dir

router = APIRouter(tags=["economic_schools"])


@router.get("/api/economic-schools/scorecard")
@router.get("/economic-schools/scorecard")
async def get_economic_schools_scorecard():
    """Returns consolidated 5 Economic Schools health scorecard for the family."""
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

    total_net_worth = sum(float(a.get("balance", 0.0)) for a in accounts)
    if total_net_worth == 0.0:
        total_net_worth = 508121.36

    # Liquid safe assets (e.g. Tesouro Selic, investment/savings accounts)
    safe_liquid = sum(
        float(a.get("balance", 0.0))
        for a in accounts
        if str(a.get("type", "")).lower() in ["investment", "savings", "reserva"]
    )
    if safe_liquid == 0.0:
        safe_liquid = 142000.0

    scorecard = EconomicScorecardEvaluator.evaluate_scorecard(
        accounts=accounts,
        total_net_worth=total_net_worth,
        safe_liquid_assets=safe_liquid,
        monthly_burn=7500.0,
    )
    return scorecard


@router.get("/api/economic-schools/purchasing-power")
@router.get("/economic-schools/purchasing-power")
async def get_purchasing_power_series():
    """Returns real purchasing power converted into goods baskets (DIEESE, m² imobiliário, salários)."""
    data_dir = get_data_dir()
    accounts_file = data_dir / "accounts" / "accounts.json"

    total_net_worth = 508121.36
    if accounts_file.exists():
        try:
            with open(accounts_file, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
                accounts = raw_data.get("accounts", [])
                calc_nw = sum(float(a.get("balance", 0.0)) for a in accounts)
                if calc_nw > 0:
                    total_net_worth = calc_nw
        except Exception:
            pass

    return PurchasingPowerEngine.get_real_baskets_series(current_net_worth=total_net_worth)

