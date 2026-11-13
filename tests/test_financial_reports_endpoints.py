"""Integration and unit tests for MEI Ceilings, Multi-Entity Liquidity and Portfolio Endpoints."""
import pytest
from fastapi.testclient import TestClient

from src.web.api import app


@pytest.fixture
def client():
    return TestClient(app)


def test_mei_ceiling_endpoint_reports_and_statements(client):
    """Verifies that both /api/reports/mei-status and /api/statements/mei-ceiling return real MEI metrics."""
    for path in ["/api/reports/mei-status", "/api/statements/mei-ceiling", "/api/reports/mei-ceiling"]:
        res = client.get(path)
        assert res.status_code == 200
        data = res.json()

        assert data["tax_year"] == 2026
        assert data["annual_ceiling_per_cnpj"] == 81000.0
        assert data["combined_annual_capacity"] == 162000.0
        assert data["tolerance_ceiling_20pct"] == 97200.0

        # Check FIX_SERVICOS calculations
        fix = data["entities"]["FIX_SERVICOS"]
        assert fix["entity_code"] == "FIX_SERVICOS"
        assert fix["titular"] == "Osmar"
        assert fix["annual_ceiling"] == 81000.0
        assert fix["gross_revenue_ytd"] >= 100000.0  # Real revenue from transactions.csv (104,632.34)
        assert fix["percentage_used"] > 100.0
        assert fix["exceeded_ceiling"] is True
        assert fix["exceeded_20pct_tolerance"] is True
        assert fix["status"] == "EXCEEDED_20_PERCENT"
        assert "Art. 14" in fix["tolerance_warning"]
        assert "retroativo" in fix["tolerance_warning"].lower()
        assert fix["margin_remaining"] == 0.0

        # Check FACILITA_VISTORIAS calculations
        facilita = data["entities"]["FACILITA_VISTORIAS"]
        assert facilita["entity_code"] == "FACILITA_VISTORIAS"
        assert facilita["titular"] == "Vera"
        assert facilita["annual_ceiling"] == 81000.0
        assert facilita["status"] == "SAFE"
        assert facilita["margin_remaining"] == 81000.0
        assert facilita["percentage_used"] == 0.0

        # Conjugal segregation check
        assert data["conjugal_segregation"]["active"] is True
        assert data["conjugal_segregation"]["anti_partner_conflict"] is False


def test_liquidity_report_endpoint(client):
    """Verifies /api/reports/liquidity returns real balances per entity and consolidated net worth."""
    res = client.get("/api/reports/liquidity")
    assert res.status_code == 200
    data = res.json()

    assert data["total_cash_brl"] == 508121.36
    assert data["total_net_worth_brl"] > data["total_cash_brl"]

    # Check entities
    by_ent = data["by_entity"]
    assert "HOUSEHOLD_OSMAR" in by_ent
    assert "FIX_SERVICOS" in by_ent
    assert "FACILITA_VISTORIAS" in by_ent

    assert by_ent["HOUSEHOLD_OSMAR"]["balance"] == 357458.00
    assert by_ent["FIX_SERVICOS"]["balance"] == 100332.34
    assert by_ent["FACILITA_VISTORIAS"]["balance"] == 50331.02

    # Check foreign assets inclusion
    assert "foreign_assets" in data
    assert data["foreign_assets"]["total_usd"] == 7003.50
    assert data["foreign_assets"]["positions_count"] == 3


def test_statements_summary_enriched_with_by_entity(client):
    """Verifies /api/statements/summary contains both multi-year data and real entity liquidity."""
    res = client.get("/api/statements/summary")
    assert res.status_code == 200
    data = res.json()

    assert "years" in data
    assert "by_year" in data
    assert "by_entity" in data
    assert "HOUSEHOLD_OSMAR" in data["by_entity"]
    assert "FIX_SERVICOS" in data["by_entity"]
    assert "FACILITA_VISTORIAS" in data["by_entity"]


def test_portfolio_summary_and_holdings_endpoints(client):
    """Verifies /api/portfolio/summary and /api/portfolio/holdings return Avenue US stocks."""
    # 1. Summary
    res_sum = client.get("/api/portfolio/summary")
    assert res_sum.status_code == 200
    sum_data = res_sum.json()
    assert sum_data["total_usd"] == 7003.50
    assert sum_data["ptax_rate"] > 0
    assert sum_data["positions_count"] == 3
    tickers = [p["ticker"] for p in sum_data["positions"]]
    assert "AAPL" in tickers
    assert "NVDA" in tickers
    assert "TSLA" in tickers

    # 2. Holdings
    res_hold = client.get("/api/portfolio/holdings")
    assert res_hold.status_code == 200
    hold_data = res_hold.json()
    assert "holdings" in hold_data
    assert hold_data["total_count"] == 3
    holdings_tickers = [h["ticker"] for h in hold_data["holdings"]]
    assert holdings_tickers == ["AAPL", "NVDA", "TSLA"]
