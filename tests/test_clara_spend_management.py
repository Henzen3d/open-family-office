"""Tests for Clara-inspired Spend Management, Segregation Compliance, and Monthly Closing."""
import pytest
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient

from src.models.transactions import Transaction
from src.models.enums import ReconciliationStatus
from src.engine.spend_compliance import SpendComplianceEngine, ComplianceEvaluation
from src.controller.monthly_closing import MonthlyClosingAuditor, MonthlyClosingAuditReport
from src.controller.mileage_tracker import MileageTracker, FieldTripRecord
from src.intelligence.assistant_tools import (
    audit_monthly_closing_tool,
    audit_spend_compliance_tool,
    calculate_mei_profit_distribution_tool,
)
from src.web.api import app


@pytest.fixture
def sample_transactions():
    return [
        # MEI Fix - Normal operational inflow
        Transaction(
            id="TX-FIX-001",
            entity_code="FIX_SERVICOS",
            account_name="Banco Inter PJ",
            date=date(2026, 11, 5),
            amount=Decimal("5000.00"),
            raw_description="PIX RECEBIDO - SERVICO MANUTENCAO",
            clean_description="Manutenção de Redes",
            category_code="SERVICOS",
            counterparty="Empresa Alpha Ltda",
        ),
        # MEI Fix - Normal operational expense
        Transaction(
            id="TX-FIX-002",
            entity_code="FIX_SERVICOS",
            account_name="Banco Inter PJ",
            date=date(2026, 11, 6),
            amount=Decimal("-450.00"),
            raw_description="PGTO CERTISIGN CERTIFICADO DIGITAL",
            clean_description="Certificado Digital",
            category_code="OPERACIONAL",
            counterparty="Certisign",
        ),
        # MEI Fix - Personal expense violation (Confusão patrimonial)
        Transaction(
            id="TX-FIX-003",
            entity_code="FIX_SERVICOS",
            account_name="Banco Inter PJ",
            date=date(2026, 11, 7),
            amount=Decimal("-380.50"),
            raw_description="COMPRA SUPERMERCADO GIASSI",
            clean_description="Supermercado Giassi",
            category_code="ALIMENTACAO",
            counterparty="Supermercado Giassi",
        ),
        # MEI Fix - Tax payment (Exempt from receipt)
        Transaction(
            id="TX-FIX-004",
            entity_code="FIX_SERVICOS",
            account_name="Banco Inter PJ",
            date=date(2026, 11, 20),
            amount=Decimal("-75.60"),
            raw_description="PAGAMENTO GUIA DAS-MEI SIMPLES NACIONAL",
            clean_description="Guia DAS-MEI",
            category_code="IMPOSTOS",
            counterparty="Receita Federal",
        ),
        # Facilita Vistorias - Normal inflow
        Transaction(
            id="TX-FAC-001",
            entity_code="FACILITA_VISTORIAS",
            account_name="Caixa Econômica PJ",
            date=date(2026, 11, 8),
            amount=Decimal("4200.00"),
            raw_description="CREDITO VISTORIA IMOVEL",
            clean_description="Laudo de Vistoria",
            category_code="SERVICOS",
            counterparty="Imobiliária Horizonte",
        ),
        # Facilita Vistorias - Fuel expense (Operational)
        Transaction(
            id="TX-FAC-002",
            entity_code="FACILITA_VISTORIAS",
            account_name="Caixa Econômica PJ",
            date=date(2026, 11, 9),
            amount=Decimal("-180.00"),
            raw_description="POSTO IPIRANGA COMBUSTIVEL",
            clean_description="Combustível Deslocamento",
            category_code="TRANSPORTE",
            counterparty="Posto Ipiranga",
        ),
        # Household PF - Internal transfer from MEI Fix (Neutralized)
        Transaction(
            id="TX-PF-001",
            entity_code="HOUSEHOLD_OSMAR",
            account_name="Nubank Ultravioleta",
            date=date(2026, 11, 10),
            amount=Decimal("3000.00"),
            raw_description="TRANSFERENCIA ENTRE CONTAS PROPRIAS",
            clean_description="Distribuição de Lucros",
            category_code="TRANSFERENCIA",
            is_transfer=True,
        ),
    ]


def test_spend_compliance_engine_exemptions():
    engine = SpendComplianceEngine()

    tax_tx = Transaction(
        id="T1", entity_code="FIX_SERVICOS", account_name="Inter",
        date=date(2026, 11, 1), amount=Decimal("-75.60"),
        raw_description="DAS-MEI SIMPLES", clean_description="DAS",
    )
    assert engine.is_exempt_from_receipt(tax_tx) is True

    inflow_tx = Transaction(
        id="T2", entity_code="FIX_SERVICOS", account_name="Inter",
        date=date(2026, 11, 1), amount=Decimal("1500.00"),
        raw_description="PIX RECEBIDO", clean_description="Serviço",
    )
    assert engine.is_exempt_from_receipt(inflow_tx) is True


def test_spend_compliance_engine_segregation_detection(sample_transactions):
    engine = SpendComplianceEngine()

    # TX-FIX-003 is Giassi supermarket on MEI -> should flag SUSPECTED_PERSONAL_ON_MEI
    giassi_tx = sample_transactions[2]
    ev = engine.evaluate_transaction(giassi_tx, has_receipt=False)
    assert ev.segregation_risk == "SUSPECTED_PERSONAL_ON_MEI"
    assert ev.risk_severity == "HIGH"
    assert "confusão patrimonial" in ev.compliance_notes.lower()
    assert ev.suggested_action is not None


def test_spend_compliance_audit_batch(sample_transactions):
    engine = SpendComplianceEngine()
    receipt_tx_ids = {"TX-FIX-002"}  # Only Certisign has matched receipt

    audit = engine.audit_batch(sample_transactions, receipt_tx_ids)
    assert audit["total_transactions"] == len(sample_transactions)
    assert audit["pending_receipts"]["count"] >= 1
    assert audit["matched_receipts"]["count"] == 1
    assert audit["segregation_alerts"]["personal_on_mei_count"] >= 1


def test_monthly_closing_auditor(sample_transactions):
    auditor = MonthlyClosingAuditor()
    receipt_tx_ids = {"TX-FIX-002", "TX-FAC-002"}

    report = auditor.audit_month(sample_transactions, receipt_tx_ids, year=2026, month=11)
    assert report.month == 11
    assert report.year == 2026
    assert "FIX_SERVICOS" in report.mei_summaries
    assert "FACILITA_VISTORIAS" in report.mei_summaries

    fix_summary = report.mei_summaries["FIX_SERVICOS"]
    assert fix_summary.gross_revenue_month == 5000.0
    assert fix_summary.annual_ceiling == 81000.0
    assert fix_summary.ceiling_used_percent > 0
    assert fix_summary.exempt_profit_distribution > 0


def test_mileage_tracker(tmp_path):
    tracker_file = tmp_path / "test_mileage.json"
    tracker = MileageTracker(data_file=tracker_file)

    trip = tracker.record_trip(
        date_str="2026-11-12",
        entity_code="FACILITA_VISTORIAS",
        service_description="Vistoria Técnica de Entrega",
        client_name="Imobiliária Premier",
        destination="Jurerê Internacional",
        distance_km=40.0,
        rate_per_km=1.50,
        toll_amount=10.0,
    )
    assert trip.distance_km == 40.0
    assert trip.total_calculated_cost == (40.0 * 1.50) + 10.0

    summary = tracker.get_monthly_summary(year=2026, month=11, entity_code="FACILITA_VISTORIAS")
    assert summary["total_trips"] >= 1
    assert summary["total_distance_km"] >= 40.0


def test_api_closing_audit_endpoint():
    client = TestClient(app)
    res = client.get("/api/closing/audit?month=11&year=2026")
    assert res.status_code == 200
    data = res.json()
    assert "closing_status" in data
    assert "checklist" in data
    assert "mei_summaries" in data
    assert "documentation_rate" in data


def test_api_mileage_endpoints():
    client = TestClient(app)
    # List trips
    res_list = client.get("/api/mileage/trips")
    assert res_list.status_code == 200
    assert "trips" in res_list.json()

    # Create trip
    payload = {
        "date": "2026-11-13",
        "entity_code": "FACILITA_VISTORIAS",
        "service_description": "Vistoria Residencial Coqueiros",
        "client_name": "Imobiliária Beira-Mar",
        "destination": "Coqueiros - Continente",
        "distance_km": 25.0,
        "rate_per_km": 1.45,
        "toll_amount": 0.0,
        "notes": "Trânsito normal na ponte.",
    }
    res_create = client.post("/api/mileage/trips", json=payload)
    assert res_create.status_code == 200
    assert res_create.json()["status"] == "CREATED"


def test_api_statements_transactions_enriched_compliance():
    client = TestClient(app)
    res = client.get("/api/statements/transactions?limit=10")
    assert res.status_code == 200
    data = res.json()
    txs = data["transactions"]
    assert len(txs) > 0
    first_tx = txs[0]
    assert "receipt_status" in first_tx
    assert "segregation_risk" in first_tx
    assert "risk_severity" in first_tx
    assert "compliance_notes" in first_tx


def test_clara_intelligence_assistant_tools():
    # Audit monthly closing tool
    closing_data = audit_monthly_closing_tool()
    assert "closing_status" in closing_data
    assert "mei_summaries" in closing_data

    # Spend compliance tool
    comp_data = audit_spend_compliance_tool()
    assert "documentation_rate" in comp_data
    assert "pending_receipts" in comp_data

    # Tax profit distribution tool
    fix_profit = calculate_mei_profit_distribution_tool("FIX_SERVICOS")
    assert "exempt_profit_distribution" in fix_profit


def test_clara_intelligence_chat_queries():
    client = TestClient(app)

    # 1. Closing Audit Query
    res_close = client.post(
        "/api/chat",
        json={"message": "Auditar fechamento do mês", "stream": False},
    )
    assert res_close.status_code == 200
    reply = res_close.json()["reply"]
    assert "Auditoria de Fechamento Contábil" in reply
    assert "Checklist" in reply

    # 2. Missing receipts query
    res_rcp = client.post(
        "/api/chat",
        json={"message": "Quais são os comprovantes pendentes?", "stream": False},
    )
    assert res_rcp.status_code == 200
    assert "Comprovantes" in res_rcp.json()["reply"]

    # 3. Profit distribution query
    res_profit = client.post(
        "/api/chat",
        json={"message": "Calcular distribuição de lucros isenta do MEI Fix", "stream": False},
    )
    assert res_profit.status_code == 200
    assert "Distribuição de Lucros Isenta" in res_profit.json()["reply"]
    assert "LC 123/2006" in res_profit.json()["reply"]

