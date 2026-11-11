"""Unit and Integration Tests for Phase 1: Generative UI & Calculadoras Interativas."""
import pytest
from fastapi.testclient import TestClient

from src.intelligence.generative_ui_schemas import (
    ArtifactType,
    InteractiveArtifact,
    CompoundInterestPayload,
    PurchaseOpportunityPayload,
    RealVsNominalPayload,
)
from src.intelligence.assistant_tools import (
    calculate_compound_interest_series,
    calculate_opportunity_cost,
    calculate_real_return,
)
from src.web.api import app


def test_generative_ui_schemas_validation():
    art = InteractiveArtifact(
        artifact_type=ArtifactType.COMPOUND_INTEREST,
        title="Simulador de Juros",
        payload={
            "initial_principal": 10000.0,
            "monthly_deposit": 1000.0,
            "annual_rate_percent": 12.0,
            "years": 10,
        },
    )
    assert art.id.startswith("ART-")
    assert art.artifact_type == ArtifactType.COMPOUND_INTEREST
    assert art.payload["initial_principal"] == 10000.0


def test_compound_interest_series_calculation():
    # R$ 10.000 initial, R$ 1.000 monthly, 10% annual, 5 years
    res = calculate_compound_interest_series(
        principal=10000.0,
        monthly=1000.0,
        annual_rate_percent=10.0,
        years=5,
    )
    assert res["years"] == 5
    assert len(res["series"]) == 5
    assert res["total_invested"] == 10000.0 + (1000.0 * 5 * 12)  # 70.000
    assert res["final_balance"] > res["total_invested"]
    assert res["total_interest"] > 0
    # Year 5 total must equal final_balance
    assert res["series"][-1]["total_balance"] == res["final_balance"]


def test_opportunity_cost_calculation():
    res = calculate_opportunity_cost(
        amount=5000.0,
        annual_rate_percent=11.25,
        years_list=[2, 5, 10],
        item_name="Novo Smartphone",
        family_monthly_income=16000.0,
    )
    assert res["cost"] == 5000.0
    assert res["hours_of_work"] == 50.0  # 5000 / (16000/160) = 50.0 hours
    assert len(res["projections"]) == 3
    # In 10 years, 5000 invested at 11.25% should be significantly higher than initial
    p10 = [p for p in res["projections"] if p["years"] == 10][0]
    assert p10["invested_fv"] > 14000.0
    assert p10["depreciated_value"] < 1000.0


def test_real_return_fisher_equation():
    # 12% nominal, 4.5% inflation, 15% tax
    res = calculate_real_return(
        nominal_rate_percent=12.0,
        inflation_annual_percent=4.5,
        income_tax_percent=15.0,
    )
    # net nominal = 12 * 0.85 = 10.2%
    # Fisher: (1 + 0.102) / (1 + 0.045) - 1 = 1.102 / 1.045 - 1 = ~0.054545 (5.45%)
    assert res["net_nominal_rate_percent"] == 10.2
    assert 5.40 <= res["real_rate_percent"] <= 5.50
    assert res["is_positive"] is True


def test_chat_simulate_endpoint():
    client = TestClient(app)
    response = client.post(
        "/api/chat/simulate",
        json={
            "artifact_type": "compound_interest",
            "params": {
                "initial_principal": 5000,
                "monthly_deposit": 500,
                "annual_rate_percent": 11.25,
                "years": 10,
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["artifact_type"] == "compound_interest"
    assert "payload" in data
    assert data["payload"]["final_balance"] > 100000


def test_chat_endpoint_triggers_artifact_for_interest_query():
    client = TestClient(app)
    response = client.post(
        "/api/chat",
        json={
            "message": "Qual é a simulação de juros compostos para guardar 500 por mês?",
            "stream": False,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "artifact" in data
    assert data["artifact"] is not None
    assert data["artifact"]["artifact_type"] == "compound_interest"

