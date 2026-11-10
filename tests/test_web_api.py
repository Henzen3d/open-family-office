"""Tests for FastAPI endpoints."""

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient
from src.web.api import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "OpenFamilyOffice"


def test_api_status(client):
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert data["system"] == "OpenFamilyOffice"
    assert "supported_entities" in data
    assert len(data["supported_entities"]) == 3


def test_chat_non_stream(client):
    response = client.post("/api/chat", json={"message": "Teto MEI", "stream": False})
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data


def test_market_chart_endpoint(client):
    response = client.get("/api/market/chart?symbol=IBOV&timeframe=1d")
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "IBOV"
    assert "points" in data
    assert "stats" in data
    assert len(data["points"]) > 0


def test_statements_summary_and_transactions(client):
    res_summary = client.get("/api/statements/summary")
    assert res_summary.status_code == 200

    res_txs = client.get("/api/statements/transactions?limit=10")
    assert res_txs.status_code == 200
    data_txs = res_txs.json()
    assert "transactions" in data_txs
    assert len(data_txs["transactions"]) > 0


def test_general_settings_asd_mode_crud(client):
    res = client.get("/api/settings/general")
    assert res.status_code == 200
    data = res.json()
    assert "asd_mode" in data

    update_res = client.post("/api/settings/general", json={"asd_mode": "asd_strict"})
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["settings"]["asd_mode"] == "asd_strict"

    # Reset back to default asd_80
    client.post("/api/settings/general", json={"asd_mode": "asd_80"})


def test_chat_asd_mode_dynamic_and_override(client):
    # Test request-level override
    res_none = client.post("/api/chat", json={"message": "qual o seu modelo?", "stream": False, "asd_mode": "none"})
    assert res_none.status_code == 200
    assert res_none.json().get("asd_mode") == "none"

    # Test prompt-driven dynamic detection without external network wait
    res_strict = client.post("/api/chat", json={"message": "Explica em ASD-STE100 qual o seu modelo?", "stream": False})
    assert res_strict.status_code == 200
    assert res_strict.json().get("asd_mode") == "asd_strict"


def test_accounts_crud_and_balance_adjustment(client):
    # 1. List accounts
    res = client.get("/api/accounts")
    assert res.status_code == 200
    data = res.json()
    assert "accounts" in data
    assert "total_cash" in data
    assert len(data["accounts"]) >= 3

    # 2. Adjust balance directly
    adj_res = client.post(
        "/api/accounts/adjust-balance",
        json={"account_id": "inter_pj", "new_balance": 12500.50, "note": "Ajuste manual real do banco Inter"},
    )
    assert adj_res.status_code == 200
    adj_data = adj_res.json()
    assert adj_data["account"]["balance"] == 12500.50
    assert "R$ 12.500,50" in adj_data["account"]["formatted_balance"]

    # 3. Add a new bank account
    add_res = client.post(
        "/api/accounts",
        json={
            "id": "itau_pf",
            "name": "Itaú Personnalité",
            "bank_name": "Itaú",
            "entity_code": "HOUSEHOLD_OSMAR",
            "holder": "Osmar",
            "purpose": "Investimentos",
            "balance": 25000.00,
            "color": "amber",
        },
    )
    assert add_res.status_code == 200
    add_data = add_res.json()
    assert add_data["account"]["id"] == "itau_pf"
    assert add_data["account"]["balance"] == 25000.00

    # 4. Clean up added account and restore inter_pj balance
    del_res = client.delete("/api/accounts/itau_pf")
    assert del_res.status_code == 200
    client.post("/api/accounts/adjust-balance", json={"account_id": "inter_pj", "new_balance": 100332.34})


