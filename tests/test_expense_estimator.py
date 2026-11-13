"""Unit tests for ExpenseEstimatorEngine and Gap Reconstruction."""
from datetime import date
from decimal import Decimal
import pytest

from src.models.transactions import Transaction
from src.models.enums import ReconciliationStatus
from src.controller.ledger_manager import LedgerManager
from src.engine.expense_estimator import ExpenseEstimatorEngine


def test_expense_estimator_gap_identification(tmp_path):
    ledger_file = tmp_path / "transactions.csv"
    mgr = LedgerManager(ledger_file=str(ledger_file))

    # Seed transactions with a gap: Jan 2026 has activity, Feb 2026 is empty, Mar 2026 has activity
    txs = [
        Transaction(
            id="TX-1",
            entity_code="HOUSEHOLD_OSMAR",
            account_name="Nubank PF",
            date=date(2026, 1, 10),
            amount=Decimal("-1800.00"),
            currency="BRL",
            raw_description="Supermercado Giassi",
            clean_description="Supermercado Giassi",
            category_code="Supermercado",
            counterparty="Giassi",
            is_transfer=False,
            reconciliation_status=ReconciliationStatus.CONFIRMED,
        ),
        Transaction(
            id="TX-2",
            entity_code="HOUSEHOLD_OSMAR",
            account_name="Nubank PF",
            date=date(2026, 1, 15),
            amount=Decimal("-350.00"),
            currency="BRL",
            raw_description="Celesc Energia",
            clean_description="Celesc Energia",
            category_code="Moradia",
            counterparty="Celesc",
            is_transfer=False,
            reconciliation_status=ReconciliationStatus.CONFIRMED,
        ),
        Transaction(
            id="TX-3",
            entity_code="HOUSEHOLD_OSMAR",
            account_name="Nubank PF",
            date=date(2026, 3, 5),
            amount=Decimal("-1900.00"),
            currency="BRL",
            raw_description="Supermercado Giassi",
            clean_description="Supermercado Giassi",
            category_code="Supermercado",
            counterparty="Giassi",
            is_transfer=False,
            reconciliation_status=ReconciliationStatus.CONFIRMED,
        ),
    ]
    mgr.save_transactions(txs)

    estimator = ExpenseEstimatorEngine(ledger_manager=mgr)
    averages = estimator.compute_category_averages()
    assert "HOUSEHOLD_OSMAR::Supermercado" in averages
    assert averages["HOUSEHOLD_OSMAR::Supermercado"].monthly_average > 1000.0

    gap_plans = estimator.identify_gap_months(
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 1),
        min_tx_count=2,
    )
    # Feb 2026 (2026-02) should be identified as a gap month
    gap_yms = [p.year_month for p in gap_plans]
    assert "2026-02" in gap_yms

    # Test applying proposals
    created = estimator.apply_estimated_proposals(gap_plans)
    assert len(created) > 0
    for t in created:
        assert t.reconciliation_status == ReconciliationStatus.ESTIMATED
        assert t.amount < 0
        assert "Lançamento estimado" in t.notes or "Estimativa" in t.clean_description

