"""Integration tests specifically verifying all modular routers (Fase 6)."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.web.api import app


@pytest.fixture
def client():
    return TestClient(app)


def test_modular_chat_router(client):
    """Verifies chat router endpoint."""
    res = client.post("/api/chat", json={"message": "Saldo das contas", "stream": False})
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert "provider" in data


def test_modular_market_router(client):
    """Verifies market router endpoints."""
    res_overview = client.get("/api/market/overview")
    assert res_overview.status_code == 200
    assert "indicators" in res_overview.json() or "selic" in str(res_overview.json()).lower()

    res_chart = client.get("/api/market/chart?symbol=USD&timeframe=1d")
    assert res_chart.status_code == 200
    chart_data = res_chart.json()
    assert chart_data["symbol"] == "USD"
    assert len(chart_data["points"]) > 0


def test_modular_statements_router(client):
    """Verifies statements router summary and transaction listing."""
    res_summary = client.get("/api/statements/summary")
    assert res_summary.status_code == 200

    res_txs = client.get("/api/statements/transactions?limit=10")
    assert res_txs.status_code == 200
    txs_data = res_txs.json()
    assert "transactions" in txs_data
    assert len(txs_data["transactions"]) <= 10


def test_modular_settings_and_accounts_router(client):
    """Verifies settings router accounts and preferences endpoints."""
    res_accounts = client.get("/api/accounts")
    assert res_accounts.status_code == 200
    accounts_data = res_accounts.json()
    assert "accounts" in accounts_data
    assert len(accounts_data["accounts"]) >= 3

    res_settings = client.get("/api/settings/general")
    assert res_settings.status_code == 200
    assert "theme" in res_settings.json()

    res_providers = client.get("/api/settings/providers")
    assert res_providers.status_code == 200
    assert "providers" in res_providers.json()


def test_modular_receipts_router(client):
    """Verifies receipts router recent listing."""
    res = client.get("/api/receipts/recent")
    assert res.status_code == 200
    data = res.json()
    assert "receipts" in data

