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


