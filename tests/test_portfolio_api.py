"""Integration tests for Portfolio & Estimation APIs and Chat Integration."""
import pytest
from fastapi.testclient import TestClient

from src.web.api import app


@pytest.fixture
def client():
    return TestClient(app)


def test_portfolio_summary_endpoint(client):
    res = client.get("/api/portfolio/us-stocks")
    assert res.status_code == 200
    data = res.json()
    assert "total_usd" in data
    assert "total_brl" in data
    assert "ptax_rate" in data
    assert "positions" in data


def test_portfolio_upsert_endpoint(client):
    payload = {
        "ticker": "AAPL",
        "shares": 10.0,
        "avg_cost_usd": 175.0,
        "current_price_usd": 220.0,
        "broker": "Avenue",
    }
    res = client.post("/api/portfolio/us-stocks", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SAVED"
    assert data["position"]["ticker"] == "AAPL"
    assert data["position"]["total_usd"] == 2200.0


def test_portfolio_nlp_sync_endpoint(client):
    payload = {
        "text": "Tenho na Avenue: 20 AAPL a $180, 10 NVDA a $120"
    }
    res = client.post("/api/portfolio/us-stocks/sync-nlp", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SYNCED"
    assert data["updated_positions_count"] >= 2


def test_ledger_gaps_preview_endpoint(client):
    res = client.get("/api/ledger/gaps/preview")
    assert res.status_code == 200
    data = res.json()
    assert "gap_months_count" in data
    assert "category_averages" in data
    assert "gap_plans" in data


def test_confirm_card_revenue_endpoint(client):
    # Test positive revenue confirmation in /api/ledger/confirm-card
    payload = {
        "card_id": "CARD-TEST-REV-01",
        "amount": 100.0,
        "date": "2026-11-11",
        "counterparty": "Cliente Lâmpada",
        "category": "Serviços Prestados",
        "entity_code": "FIX_SERVICOS",
        "account_name": "Banco Inter PJ",
        "card_type": "REVENUE_CONFIRMATION",
        "is_revenue": True,
    }
    res = client.post("/api/ledger/confirm-card", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "CONFIRMED"
    assert data["transaction"]["amount"] == 100.0  # Positive amount for revenue!
    assert "Receita" in data["transaction"]["clean_description"]
