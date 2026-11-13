"""Unit tests for LedgerManager idempotency, deduplication, and transaction persistence."""
from datetime import date
from decimal import Decimal
import tempfile
from pathlib import Path
import pytest

from src.controller.ledger_manager import LedgerManager
from src.models.transactions import Transaction
from src.models.enums import ReconciliationStatus


@pytest.fixture
def temp_ledger(tmp_path):
    ledger_file = tmp_path / "ledger" / "transactions.csv"
    return LedgerManager(ledger_file=str(ledger_file))


def test_compute_fingerprint():
    # Should normalize case, decimal representation, and date
    fp1 = LedgerManager.compute_fingerprint("FIX_SERVICOS", date(2026, 11, 10), Decimal("150.00"), "Instalação Elétrica")
    fp2 = LedgerManager.compute_fingerprint("fix_servicos", "2026-11-10", "150.0", "instalação elétrica ")
    assert fp1 == fp2
    assert "FIX_SERVICOS" in fp1
    assert "15000" in fp1


def test_add_single_transaction_success(temp_ledger):
    tx = Transaction(
        id="tx-test-01",
        entity_code="HOUSEHOLD_OSMAR",
        account_name="Nubank PF",
        date=date(2026, 11, 8),
        amount=Decimal("-120.50"),
        clean_description="Supermercado Central",
    )
    added = temp_ledger.add_single_transaction(tx)
    assert added is True

    txs = temp_ledger.load_transactions()
    assert len(txs) == 1
    assert txs[0].id == "tx-test-01"


def test_add_single_transaction_duplicate_id_rejected(temp_ledger):
    tx1 = Transaction(
        id="tx-test-dup-id",
        entity_code="HOUSEHOLD_OSMAR",
        account_name="Nubank PF",
        date=date(2026, 11, 8),
        amount=Decimal("-50.00"),
        clean_description="Padaria Central",
    )
    assert temp_ledger.add_single_transaction(tx1) is True

    # Same ID, different description
    tx2 = Transaction(
        id="tx-test-dup-id",
        entity_code="HOUSEHOLD_OSMAR",
        account_name="Nubank PF",
        date=date(2026, 11, 8),
        amount=Decimal("-50.00"),
        clean_description="Outra Descricao",
    )
    assert temp_ledger.add_single_transaction(tx2) is False
    assert len(temp_ledger.load_transactions()) == 1


def test_add_single_transaction_duplicate_fingerprint_rejected(temp_ledger):
    tx1 = Transaction(
        id="tx-test-fp-1",
        entity_code="FIX_SERVICOS",
        account_name="Inter PJ",
        date=date(2026, 11, 11),
        amount=Decimal("100.00"),
        clean_description="Receita Cliente Lâmpada (Serviços Prestados)",
    )
    assert temp_ledger.add_single_transaction(tx1) is True

    # Different ID (e.g. simulated re-confirmation from mobile UI), but identical business fingerprint
    tx2 = Transaction(
        id="TX-CARD-1794500000000",
        entity_code="FIX_SERVICOS",
        account_name="Inter PJ",
        date=date(2026, 11, 11),
        amount=Decimal("100.00"),
        clean_description="Receita Cliente Lâmpada (Serviços Prestados)",
    )
    assert temp_ledger.add_single_transaction(tx2) is False

    txs = temp_ledger.load_transactions()
    assert len(txs) == 1
    assert txs[0].id == "tx-test-fp-1"


def test_deduplicate_ledger(temp_ledger):
    tx1 = Transaction(
        id="tx-01",
        entity_code="HOUSEHOLD_OSMAR",
        account_name="Nubank PF",
        date=date(2026, 11, 8),
        amount=Decimal("-138.50"),
        clean_description="Compra Supermercado Giassi (Alimentação)",
    )
    tx2 = Transaction(
        id="tx-02",
        entity_code="HOUSEHOLD_OSMAR",
        account_name="Nubank PF",
        date=date(2026, 11, 8),
        amount=Decimal("-138.50"),
        clean_description="Compra Supermercado Giassi (Alimentação)",
    )
    tx3 = Transaction(
        id="tx-03",
        entity_code="FACILITA_VISTORIAS",
        account_name="Caixa PJ",
        date=date(2026, 11, 9),
        amount=Decimal("350.00"),
        clean_description="Laudo Vistoria Centro",
    )

    # Save all 3 directly to CSV bypassing single add check
    temp_ledger.save_transactions([tx1, tx2, tx3])
    assert len(temp_ledger.load_transactions()) == 3

    removed = temp_ledger.deduplicate_ledger()
    assert removed == 1

    remaining = temp_ledger.load_transactions()
    assert len(remaining) == 2
    remaining_ids = {t.id for t in remaining}
    assert "tx-03" in remaining_ids
    assert ("tx-01" in remaining_ids or "tx-02" in remaining_ids)

