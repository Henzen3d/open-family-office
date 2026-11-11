"""Unit and integration tests for 5 Economic Schools Evaluator & Endpoints."""
from __future__ import annotations

import pytest
from starlette.testclient import TestClient

from src.engine.economic_schools_evaluator import (
    BehavioralCushionCalculator,
    EconomicScorecardEvaluator,
    HardAssetCalculator,
    InstitutionalSafetyEvaluator,
    PurchasingPowerEngine,
    RealReturnEngine,
)
from src.web.api import app


def test_hard_asset_calculator():
    accounts = [
        {"id": "acc-1", "name": "Nubank Corrente", "type": "checking", "balance": 15000.0},
        {"id": "acc-2", "name": "Tesouro Selic", "type": "investment", "balance": 150000.0},
    ]
    # properties = 380k, gold/crypto = 45k -> hard assets = 425k
    res = HardAssetCalculator.calculate(
        accounts=accounts,
        total_net_worth=590000.0,
        properties_value=380000.0,
        gold_crypto_value=45000.0,
    )

    assert res["hard_assets_total"] == 425000.0
    assert res["fiat_cash_total"] == 15000.0
    assert res["hard_asset_ratio"] > 60.0
    assert res["badge"] == "safe"
    assert res["pillar_score"] == 20.0


def test_behavioral_cushion_calculator():
    # R$ 150.000 liquid / R$ 7.500 burn = 20 months
    res = BehavioralCushionCalculator.calculate(safe_liquid_assets=150000.0, monthly_essential_burn=7500.0)
    assert res["cushion_months"] == 20.0
    assert res["cushion_years"] == pytest.approx(1.67, rel=1e-2)
    assert res["badge"] == "moderate"

    # Robust cushion: R$ 300.000 liquid / R$ 7.500 burn = 40 months
    res_opt = BehavioralCushionCalculator.calculate(safe_liquid_assets=300000.0, monthly_essential_burn=7500.0)
    assert res_opt["cushion_months"] == 40.0
    assert res_opt["badge"] == "optimal"
    assert res_opt["pillar_score"] == 25.0


def test_real_return_fisher_engine():
    # 12% nominal gross, 15% tax (net nominal = 10.2%), 4.8% inflation
    # Fisher: (1 + 0.102) / (1 + 0.048) - 1 = 1.102 / 1.048 - 1 = 5.15%
    res = RealReturnEngine.calculate_fisher_breakdown(
        nominal_annual_rate=12.0,
        annual_inflation_rate=4.8,
        tax_rate=15.0,
    )

    assert res["real_net_percent"] == pytest.approx(5.15, rel=1e-2)
    assert res["pillar_score"] == 20.0
    assert "IR e a inflação corrói" in res["verdict"]


def test_purchasing_power_engine():
    res = PurchasingPowerEngine.get_real_baskets_series(current_net_worth=500000.0)
    assert res["units"]["cestas_basicas"] > 500
    assert res["units"]["m2_imobiliario"] > 50
    assert res["units"]["salarios_minimos"] > 300
    assert len(res["historical_series"]) == 3


def test_institutional_safety_evaluator():
    accounts = [
        {"name": "Inter PJ Conta Corrente", "balance": 45000.0},
        {"name": "Caixa PJ", "balance": 12000.0},
        {"name": "Nubank PF", "balance": 28000.0},
    ]
    res = InstitutionalSafetyEvaluator.evaluate(accounts=accounts, fgc_limit_per_inst=250000.0)
    assert len(res["fgc_breaches"]) == 0
    assert res["pillar_score"] == 20.0
    assert len(res["checklist"]) == 4


def test_economic_scorecard_evaluator():
    accounts = [
        {"name": "Nubank Corrente", "type": "checking", "balance": 8000.0},
        {"name": "Tesouro Selic", "type": "investment", "balance": 180000.0},
    ]
    scorecard = EconomicScorecardEvaluator.evaluate_scorecard(
        accounts=accounts,
        total_net_worth=508000.0,
        safe_liquid_assets=180000.0,
        monthly_burn=7500.0,
    )

    assert 0 <= scorecard["overall_score"] <= 100
    assert "pillars" in scorecard
    assert len(scorecard["pillars"]) == 5
    assert scorecard["rating"] != ""


def test_economic_schools_api_endpoints():
    client = TestClient(app)

    # 1. Scorecard endpoint
    resp_sc = client.get("/api/economic-schools/scorecard")
    assert resp_sc.status_code == 200
    data_sc = resp_sc.json()
    assert "overall_score" in data_sc
    assert "pillars" in data_sc
    assert "austrian" in data_sc["pillars"]
    assert "behavioral" in data_sc["pillars"]
    assert "monetarist" in data_sc["pillars"]
    assert "institutional" in data_sc["pillars"]
    assert "neoclassical" in data_sc["pillars"]

    # 2. Purchasing power endpoint
    resp_pp = client.get("/api/economic-schools/purchasing-power")
    assert resp_pp.status_code == 200
    data_pp = resp_pp.json()
    assert "units" in data_pp
    assert "historical_series" in data_pp

