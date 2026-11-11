"""Unit and integration tests for Multi-Currency, Forex Engine, US Tax Engine & API."""
from __future__ import annotations

from decimal import Decimal
import pytest
from starlette.testclient import TestClient

from src.models.currency import CurrencyCode, MultiCurrencyAmount
from src.engine.forex_cross_border_engine import (
    CbeBacenMonitor,
    PtaxRateService,
    RemittanceCalculator,
)
from src.engine.us_tax_engine import (
    ScheduleDClassifier,
    TaxAdvantagedAccountsTracker,
    W8BenMonitor,
)
from src.web.api import app


def test_multi_currency_model():
    # Test BRL model auto-conversion
    amt_brl = MultiCurrencyAmount(amount=Decimal("5820.00"), currency=CurrencyCode.BRL, ptax_rate=Decimal("5.82"))
    assert amt_brl.converted_brl == Decimal("5820.00")
    assert amt_brl.converted_usd == Decimal("1000.00")

    # Test USD model auto-conversion
    amt_usd = MultiCurrencyAmount(amount=Decimal("2000.00"), currency=CurrencyCode.USD, ptax_rate=Decimal("5.82"))
    assert amt_usd.converted_usd == Decimal("2000.00")
    assert amt_usd.converted_brl == Decimal("11640.00")


def test_ptax_rate_service():
    rates = PtaxRateService.get_rates()
    assert "USD_BRL" in rates["rates"]
    assert rates["rates"]["USD_BRL"] > 0

    # Conversion BRL -> USD
    conv_usd = PtaxRateService.convert(amount=5820.0, from_curr="BRL", to_curr="USD", custom_rate=5.82)
    assert conv_usd["converted_amount"] == 1000.0

    # Conversion USD -> BRL
    conv_brl = PtaxRateService.convert(amount=1000.0, from_curr="USD", to_curr="BRL", custom_rate=5.82)
    assert conv_brl["converted_amount"] == 5820.0


def test_remittance_calculator():
    res = RemittanceCalculator.calculate(amount_brl=10000.0, purpose="same_ownership", ptax_usd=5.82)
    assert res["amount_brl"] == 10000.0
    assert len(res["comparisons"]) == 4
    # Highest USD received provider ranked first
    assert res["comparisons"][0]["net_usd_received"] >= res["comparisons"][-1]["net_usd_received"]
    assert res["difference_vs_worst_usd"] > 0
    # IOF for same_ownership is 1.1%
    assert res["comparisons"][0]["iof_rate_percent"] == 1.1


def test_cbe_bacen_monitor():
    # Exempt below US$ 1M
    res_exempt = CbeBacenMonitor.check_threshold(total_foreign_assets_usd=450000.0)
    assert res_exempt["severity"] == "safe"
    assert res_exempt["percentage_of_threshold"] == 45.0

    # Mandatory above US$ 1M
    res_compulsory = CbeBacenMonitor.check_threshold(total_foreign_assets_usd=1200000.0)
    assert res_compulsory["severity"] == "danger"
    assert "Compulsória" in res_compulsory["status"]


def test_us_tax_advantaged_accounts():
    res = TaxAdvantagedAccountsTracker.evaluate_contributions(
        contributed_401k=20000.0,
        contributed_ira=7000.0,
        contributed_hsa=4300.0,
        age=45,
    )
    assert res["accounts"]["401k"]["remaining_margin"] == 3500.0
    assert res["accounts"]["roth_ira"]["remaining_margin"] == 0.0
    assert res["accounts"]["roth_ira"]["percentage_filled"] == 100.0
    assert res["estimated_federal_tax_saved_this_year"] > 0


def test_schedule_d_classifier():
    # Short term: held 180 days (< 365 days)
    res_st = ScheduleDClassifier.classify(
        asset_symbol="NVDA",
        purchase_date_str="2025-01-10",
        sale_date_str="2025-07-10",
        purchase_price=100.0,
        sale_price=150.0,
        quantity=10.0,
    )
    assert not res_st["is_long_term"]
    assert res_st["classification"] == "Short-Term Capital Gain"
    assert res_st["gain_or_loss"] == 500.0

    # Long term: held 400 days (>= 365 days)
    res_lt = ScheduleDClassifier.classify(
        asset_symbol="VOO",
        purchase_date_str="2024-01-10",
        sale_date_str="2025-02-15",
        purchase_price=400.0,
        sale_price=500.0,
        quantity=5.0,
    )
    assert res_lt["is_long_term"]
    assert res_lt["classification"] == "Long-Term Capital Gain"
    assert res_lt["gain_or_loss"] == 500.0


def test_w8ben_monitor():
    from datetime import date
    # Signed April 2024 -> Valid through Dec 31, 2027
    res = W8BenMonitor.check_status(signed_date_str="2024-04-10", reference_date=date(2026, 6, 1))
    assert res["expiration_date"] == "2027-12-31"
    assert res["severity"] == "safe"
    assert res["days_remaining"] > 500


def test_cross_border_api_endpoints():
    client = TestClient(app)

    # 1. Forex overview
    resp_rates = client.get("/api/forex/overview")
    assert resp_rates.status_code == 200
    assert "rates" in resp_rates.json()

    # 2. Currency conversion
    resp_conv = client.post(
        "/api/forex/convert",
        json={"amount": 1000.0, "from_currency": "USD", "to_currency": "BRL"},
    )
    assert resp_conv.status_code == 200
    assert resp_conv.json()["converted_amount"] > 1000.0

    # 3. Remittance simulation
    resp_remit = client.post(
        "/api/forex/remittance",
        json={"amount_brl": 5000.0, "purpose": "same_ownership"},
    )
    assert resp_remit.status_code == 200
    assert len(resp_remit.json()["comparisons"]) == 4

    # 4. Compliance radar
    resp_comp = client.get("/api/cross-border/compliance")
    assert resp_comp.status_code == 200
    assert "w8ben" in resp_comp.json()
    assert "cbe_bacen" in resp_comp.json()

    # 5. US Tax overview
    resp_ustax = client.get("/api/us-tax/overview")
    assert resp_ustax.status_code == 200
    assert "accounts" in resp_ustax.json()

