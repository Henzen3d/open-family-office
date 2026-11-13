"""Unit tests for Universal NLP Financial Parser (Phase 7)."""
import pytest

from src.intelligence.nlp_transaction_parser import (
    parse_monetary_amount,
    parse_natural_transaction,
    parse_balance_list,
    parse_us_stocks_list,
    parse_estimation_request,
)


def test_parse_monetary_amount():
    assert parse_monetary_amount("Ganhei R$ 100,00 ontem") == 100.0
    assert parse_monetary_amount("Ganhei R$100 na fix") == 100.0
    assert parse_monetary_amount("paguei 45.50 na farmacia") == 45.50
    assert parse_monetary_amount("faturei 1500 reais") == 1500.0
    assert parse_monetary_amount("R$ 1.500") == 1500.0
    assert parse_monetary_amount("R$ 1.500,00") == 1500.0
    assert parse_monetary_amount("1.250.000") == 1250000.0
    assert parse_monetary_amount("R$ 12.500") == 12500.0
    assert parse_monetary_amount("gastei 50 conto") == 50.0
    assert parse_monetary_amount("30 pila") == 30.0
    assert parse_monetary_amount("sem valor aqui") is None


def test_parse_natural_expense_household_items_dont_force_fix_servicos():
    # Household items like lampada and chuveiro should default to HOUSEHOLD_OSMAR when not an explicit Fix business transaction
    res1 = parse_natural_transaction("Comprei lâmpada para casa por R$ 25,00")
    assert res1 is not None
    assert res1["entity_code"] == "HOUSEHOLD_OSMAR"
    assert res1["account_name"] == "Nubank PF"
    assert res1["is_revenue"] is False
    assert res1["amount"] == 25.0

    res2 = parse_natural_transaction("Gastei 150 reais no conserto do chuveiro de casa")
    assert res2 is not None
    assert res2["entity_code"] == "HOUSEHOLD_OSMAR"
    assert res2["account_name"] == "Nubank PF"
    assert res2["is_revenue"] is False
    assert res2["amount"] == 150.0

    res3 = parse_natural_transaction("Comprei lâmpada led 30 conto")
    assert res3 is not None
    assert res3["entity_code"] == "HOUSEHOLD_OSMAR"
    assert res3["is_revenue"] is False

    # Explicit Fix Servicios purchase should route to FIX_SERVICOS
    res4 = parse_natural_transaction("Comprei materiais para a fix serviços por 80 reais")
    assert res4 is not None
    assert res4["entity_code"] == "FIX_SERVICOS"
    assert res4["account_name"] == "Banco Inter PJ"
    assert res4["is_revenue"] is False


def test_parse_natural_revenue_fix_servicos():
    text = "Ganhei R$100,00 em um atendimento na fix serviços instalando uma lampada"
    res = parse_natural_transaction(text)
    assert res is not None
    assert res["is_revenue"] is True
    assert res["amount"] == 100.0
    assert res["raw_amount"] == 100.0
    assert res["entity_code"] == "FIX_SERVICOS"
    assert res["account_name"] == "Banco Inter PJ"
    assert res["category"] == "Serviços Prestados"
    assert "Instalação de lampada" in res["clean_description"] or "Instalação" in res["clean_description"]
    assert res["type"] == "REVENUE_CONFIRMATION"


def test_parse_natural_revenue_facilita_vistorias():
    text = "Faturei 350 reais com laudo de vistoria no centro pela facilita"
    res = parse_natural_transaction(text)
    assert res is not None
    assert res["is_revenue"] is True
    assert res["amount"] == 350.0
    assert res["entity_code"] == "FACILITA_VISTORIAS"
    assert res["account_name"] == "Caixa PJ"
    assert res["category"] == "Vistorias Imobiliárias"


def test_parse_natural_expense_household():
    text = "Gastei R$ 185,50 no supermercado giassi hoje"
    res = parse_natural_transaction(text)
    assert res is not None
    assert res["is_revenue"] is False
    assert res["amount"] == 185.50
    assert res["raw_amount"] == 185.50
    assert res["entity_code"] == "HOUSEHOLD_OSMAR"
    assert res["account_name"] == "Nubank PF"
    assert res["category"] == "Supermercado"
    assert res["type"] == "EXPENSE_CONFIRMATION"


def test_parse_balance_list():
    text = """
    Nubank: R$ 12.500,00
    Inter PJ: R$ 8.300,00
    Caixa: R$ 4.100,00
    """
    res = parse_balance_list(text)
    assert res is not None
    assert len(res) == 3
    
    nu = next(r for r in res if r["account_id"] == "nubank_pf")
    assert nu["new_balance"] == 12500.0
    
    inter = next(r for r in res if r["account_id"] == "inter_pj")
    assert inter["new_balance"] == 8300.0
    
    caixa = next(r for r in res if r["account_id"] == "caixa_pj")
    assert caixa["new_balance"] == 4100.0


def test_parse_us_stocks_list():
    text = "Tenho na Avenue: 15 AAPL a $180, 10 NVDA a $120, 8 MSFT a $400"
    res = parse_us_stocks_list(text)
    assert res is not None
    assert res["broker"] == "Avenue"
    assert res["count"] >= 3
    
    tickers = {item["ticker"]: item for item in res["items"]}
    assert "AAPL" in tickers
    assert tickers["AAPL"]["shares"] == 15.0
    assert tickers["AAPL"]["avg_cost_usd"] == 180.0
    assert tickers["NVDA"]["shares"] == 10.0
    assert tickers["MSFT"]["shares"] == 8.0


def test_parse_estimation_request():
    assert parse_estimation_request("usar média dos meses para lançar estimativa de gastos") is True
    assert parse_estimation_request("preencher meses vazios para fechar as contas") is True
    assert parse_estimation_request("qual o saldo do nubank?") is False
