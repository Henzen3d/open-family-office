"""Unit and integration tests for Strategy Engine and Strategy Hub Router."""
from __future__ import annotations

import pytest
from starlette.testclient import TestClient

from src.engine.strategy_engine import (
    CarTCOCalculator,
    GadgetPurchaseCalculator,
    MortgageVsRentCalculator,
    MultiSchoolAdvisoryEvaluator,
    OpportunityScanner,
)
from src.web.api import app


def test_opportunity_scanner_idle_cash():
    accounts = [
        {"id": "acc-1", "name": "Caixa Econômica Corrente", "type": "checking", "balance": 24000.0, "earning_rate": 0.0},
        {"id": "acc-2", "name": "Tesouro Selic", "type": "investment", "balance": 150000.0, "earning_rate": 11.25},
        {"id": "acc-3", "name": "Nubank PJ Pequena", "type": "checking", "balance": 1200.0, "earning_rate": 0.0},
    ]

    alerts = OpportunityScanner.scan_idle_cash(accounts, selic_annual_rate=11.25)
    # Only acc-1 exceeds threshold (5000) and is non-yielding checking
    assert len(alerts) == 1
    assert alerts[0]["category"] == "idle_cash"
    assert alerts[0]["balance"] == 24000.0
    assert alerts[0]["monthly_impact"] > 0
    assert "Caixa Econômica Corrente" in alerts[0]["title"]


def test_opportunity_scanner_mei_ceiling():
    # Fix MEI at 85% of 81k (68,850)
    alerts = OpportunityScanner.scan_mei_tax_ceiling(revenue_fix=69000.0, revenue_facilita=20000.0, ceiling=81000.0)
    assert len(alerts) == 1
    assert alerts[0]["category"] == "tax_ceiling"
    assert "Fix Serviços MEI" in alerts[0]["title"]
    assert alerts[0]["severity"] == "warning"
    assert alerts[0]["percentage_used"] > 80.0


def test_car_tco_calculator():
    calc = CarTCOCalculator.calculate(
        car_value=120000.0,
        down_payment=40000.0,
        loan_months=48,
        loan_annual_rate=16.5,
        monthly_km=1200.0,
        km_per_liter=11.5,
        fuel_price_liter=5.89,
        annual_insurance=4200.0,
    )

    mb = calc["monthly_breakdown"]
    assert mb["financing_installment"] > 0
    assert mb["fuel"] > 0
    assert mb["depreciation"] > 0
    assert mb["ipva"] > 0
    assert mb["total_monthly_tco"] > mb["financing_installment"]
    assert calc["annual_tco"] == pytest.approx(mb["total_monthly_tco"] * 12.0, rel=1e-2)
    assert "opportunity_comparison" in calc
    assert calc["opportunity_comparison"]["in_4_years"]["portfolio_if_invested"] > 0


def test_mortgage_vs_rent_calculator():
    calc = MortgageVsRentCalculator.calculate(
        property_value=600000.0,
        down_payment=120000.0,
        loan_years=30,
        loan_annual_rate=10.5,
        monthly_rent=2500.0,
        annual_property_appreciation=5.0,
        annual_portfolio_yield=10.5,
    )

    assert calc["initial_installment"] > 0
    assert len(calc["series"]) == 30
    assert calc["final_30y_buy_net_worth"] > 0
    assert calc["final_30y_rent_net_worth"] > 0
    assert calc["recommended_path"] in ["Comprar Imóvel", "Alugar e Investir"]


def test_gadget_calculator():
    calc = GadgetPurchaseCalculator.calculate(
        item_name="MacBook Pro M3",
        cash_price=15000.0,
        cash_discount_percent=10.0,
        installments_count=12,
        benchmark_annual_rate=11.25,
        family_monthly_income=15000.0,
    )

    assert calc["actual_cash_price"] == 13500.0
    assert calc["family_work_hours_cost"] == 160.0
    assert calc["better_choice"] in ["À Vista com Desconto", "Parcelado no Cartão"]
    assert calc["opportunity_cost"]["in_10_years"] > 15000.0


def test_multi_school_advisory():
    eval_res = MultiSchoolAdvisoryEvaluator.evaluate(
        topic="Compra de carro zero km R$ 130.000",
        amount=130000.0,
    )

    assert 0 <= eval_res["consolidated_score"] <= 10
    assert len(eval_res["evaluations"]) == 5
    school_names = [e["school"] for e in eval_res["evaluations"]]
    assert "Escola Austríaca" in school_names
    assert "Economia Comportamental" in school_names
    assert "Escola Monetarista" in school_names
    assert "Economia Institucional" in school_names
    assert "Escola Neoclássica" in school_names


def test_strategy_api_endpoints():
    client = TestClient(app)

    # 1. Opportunities radar
    resp_opp = client.get("/api/strategy/opportunities")
    assert resp_opp.status_code == 200
    data_opp = resp_opp.json()
    assert "summary" in data_opp
    assert "alerts" in data_opp

    # 2. Car simulation
    resp_car = client.post(
        "/api/strategy/simulate/car",
        json={
            "car_value": 90000.0,
            "down_payment": 30000.0,
            "loan_months": 36,
            "loan_annual_rate": 15.0,
        },
    )
    assert resp_car.status_code == 200
    assert "total_monthly_tco" in resp_car.json()["monthly_breakdown"]

    # 3. Real estate simulation
    resp_re = client.post(
        "/api/strategy/simulate/real-estate",
        json={
            "property_value": 500000.0,
            "down_payment": 100000.0,
            "loan_years": 25,
            "loan_annual_rate": 9.8,
            "monthly_rent": 2200.0,
        },
    )
    assert resp_re.status_code == 200
    assert len(resp_re.json()["series"]) == 25

    # 4. Gadget simulation
    resp_gadget = client.post(
        "/api/strategy/simulate/gadget",
        json={
            "item_name": "iPhone 16 Pro",
            "cash_price": 9500.0,
            "cash_discount_percent": 12.0,
            "installments_count": 10,
        },
    )
    assert resp_gadget.status_code == 200
    assert resp_gadget.json()["actual_cash_price"] == 9500.0 * 0.88

    # 5. Advisory council
    resp_council = client.post(
        "/api/strategy/advisory-council",
        json={
            "topic": "Reforma do telhado e cozinha R$ 40.000",
            "amount": 40000.0,
        },
    )
    assert resp_council.status_code == 200
    assert len(resp_council.json()["evaluations"]) == 5

