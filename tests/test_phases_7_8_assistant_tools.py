"""Unit tests for Phase 7 (Assistant Tool-Calling) & Phase 8 (Interactive Chat Confirmation Cards)."""
import json
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient

from src.intelligence.assistant_tools import (
    get_account_balances,
    get_tax_limit_status,
    get_upcoming_bills,
    get_runway_status,
    get_withdrawals_summary,
    extract_expense_proposal,
)
from src.llm.smart_router import SmartRouter
from src.web.api import app


@pytest.fixture
def api_client():
    return TestClient(app)


def test_get_account_balances():
    balances = get_account_balances()
    assert balances["total_cash"] == 508121.36
    assert len(balances["accounts"]) == 3
    assert balances["accounts"][0]["balance"] == 357458.00  # Nubank PF
    assert balances["accounts"][1]["balance"] == 100332.34  # Inter PJ
    assert balances["accounts"][2]["balance"] == 50331.02   # Caixa PJ
    assert "LC 123/2006" in balances["segregation_status"]


def test_get_tax_limit_status():
    tax = get_tax_limit_status()
    assert tax["annual_ceiling_per_cnpj"] == 81000.00
    assert tax["combined_family_capacity"] == 162000.00
    assert tax["fix_servicos"]["issued"] == 34200.00
    assert tax["fix_servicos"]["margin"] == 46800.00
    assert tax["facilita_vistorias"]["issued"] == 25110.00
    assert tax["facilita_vistorias"]["margin"] == 55890.00


def test_get_upcoming_bills():
    bills_data = get_upcoming_bills(days=7)
    assert len(bills_data["bills"]) >= 1
    # Check that fatura nubank or DAS MEI exists
    titles = [b["title"] for b in bills_data["bills"]]
    assert any("Nubank" in t or "DAS" in t for t in titles)


def test_get_runway_status():
    runway = get_runway_status()
    assert runway["total_reserve"] == 508121.36
    assert runway["monthly_burn"] == 11515.00
    assert runway["runway_months"] == 44.1
    assert runway["runway_years"] == 3.7


def test_get_withdrawals_summary():
    withd = get_withdrawals_summary()
    assert withd["total_withdrawn_ytd"] == 56500.00
    assert len(withd["distributions"]) == 2


def test_extract_expense_proposal_household_giassi():
    text = "Registra essa compra como despesa da casa, paga pelo cartão Nubank pessoal: R$ 138,50 no Giassi"
    card = extract_expense_proposal(text)
    assert card is not None
    assert card["amount"] == 138.50
    assert card["formatted_amount"] == "R$ 138,50"
    assert "Giassi" in card["counterparty"]
    assert card["category"] == "Alimentação"
    assert card["entity_code"] == "HOUSEHOLD_OSMAR"
    assert card["account_name"] == "Nubank PF"
    assert card["status"] == "AWAITING_CONFIRMATION"


def test_extract_expense_proposal_inter_pj_materiais():
    text = "Comprei materiais elétricos de R$ 280,00 na Tigre com cartão Inter PJ"
    card = extract_expense_proposal(text)
    assert card is not None
    assert card["amount"] == 280.00
    assert card["formatted_amount"] == "R$ 280,00"
    assert "Tigre" in card["counterparty"]
    assert card["category"] == "Materiais & Manutenção"
    assert card["entity_code"] == "FIX_SERVICOS"
    assert card["account_name"] == "Banco Inter PJ"


def test_smart_router_balances_query():
    router = SmartRouter()
    res = router.execute_chat("Quanto temos disponível somando nossas três contas?")
    assert "508.121,36" in res["reply"]
    assert "Nubank PF" in res["reply"]
    assert "Banco Inter PJ" in res["reply"]
    assert "Caixa PJ" in res["reply"]


def test_smart_router_tax_query():
    router = SmartRouter()
    res = router.execute_chat("Quanto a Fix faturou este ano e qual o teto MEI?")
    assert "81.000,00" in res["reply"]
    assert "Fix Serviços" in res["reply"]
    assert "34.200,00" in res["reply"]


def test_smart_router_upcoming_bills_query():
    router = SmartRouter()
    res = router.execute_chat("Quais contas vencem nos próximos sete dias?")
    assert "Obrigações nos próximos" in res["reply"]
    assert "Nubank" in res["reply"] or "DAS" in res["reply"]


def test_smart_router_expense_card_generation():
    router = SmartRouter()
    msg = "Registra essa compra como despesa da casa, paga pelo cartão Nubank pessoal: R$ 138,50 no Giassi"
    res = router.execute_chat(msg)
    assert "confirmation_card" in res
    assert res["confirmation_card"]["amount"] == 138.50
    assert res["confirmation_card"]["status"] == "AWAITING_CONFIRMATION"


def test_api_confirm_card_endpoint(api_client, tmp_path, monkeypatch):
    test_csv = tmp_path / "test_transactions.csv"
    with open(test_csv, "w", encoding="utf-8") as f:
        f.write("id,entity_code,account_name,date,amount,currency,raw_description,clean_description,category_code,counterparty,is_transfer,transfer_pair_id,reconciliation_status,notes\n")

    monkeypatch.setenv("DATA_DIR", str(tmp_path))

    payload = {
        "card_id": "CARD-TEST-123",
        "amount": 138.50,
        "date": "2026-11-08",
        "counterparty": "Supermercado Giassi",
        "category": "Alimentação",
        "entity_code": "HOUSEHOLD_OSMAR",
        "account_name": "Nubank PF",
        "notes": "Compra test aprovada",
    }

    res = api_client.post("/api/ledger/confirm-card", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "CONFIRMED"
    assert data["transaction"]["amount"] == -138.50
    assert data["transaction"]["entity_code"] == "HOUSEHOLD_OSMAR"
    assert data["transaction"]["counterparty"] == "Supermercado Giassi"

