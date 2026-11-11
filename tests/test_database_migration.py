"""Tests for DatabaseManager, CsvToSqliteMigrator and BackupManager."""
from __future__ import annotations

import os
import tempfile
from decimal import Decimal
from pathlib import Path
import pytest

from src.database.db import DatabaseManager
from src.database.migration_from_csv import CsvToSqliteMigrator
from src.database.backup_manager import BackupManager


def test_database_manager_wal_and_transaction():
    """Verifies that DatabaseManager enforces WAL mode and transaction rollback on error."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        db_path = Path(tmp_dir) / "test.db"
        db = DatabaseManager(db_path)

        # Verify PRAGMAs
        conn = db.get_connection()
        try:
            mode = conn.execute("PRAGMA journal_mode;").fetchone()[0]
            assert mode.lower() == "wal"
            fk = conn.execute("PRAGMA foreign_keys;").fetchone()[0]
            assert fk == 1
        finally:
            conn.close()

        # Test successful transaction
        with db.transaction() as conn:
            conn.execute(
                "INSERT INTO accounts (id, name, entity_code, balance_cents) VALUES (?, ?, ?, ?)",
                ("acc_test_1", "Test Account", "HOUSEHOLD_OSMAR", 100000),
            )

        row = db.fetchone("SELECT * FROM accounts WHERE id = ?", ("acc_test_1",))
        assert row is not None
        assert row["balance_cents"] == 100000

        # Test transaction rollback on exception
        with pytest.raises(RuntimeError):
            with db.transaction() as conn:
                conn.execute(
                    "INSERT INTO accounts (id, name, entity_code, balance_cents) VALUES (?, ?, ?, ?)",
                    ("acc_test_2", "Failed Account", "HOUSEHOLD_OSMAR", 50000),
                )
                raise RuntimeError("Simulated crash")

        row2 = db.fetchone("SELECT * FROM accounts WHERE id = ?", ("acc_test_2",))
        assert row2 is None


def test_csv_to_sqlite_migration_integrity():
    """Verifies that the live migration runs without data loss and maintains identical sums."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        db_path = Path(tmp_dir) / "migrated.db"
        db = DatabaseManager(db_path)

        migrator = CsvToSqliteMigrator(db_manager=db)
        result = migrator.run_migration(force=True)

        assert result["status"] == "SUCCESS"
        assert result["stats"]["transactions_migrated"] > 0
        assert result["stats"]["accounts_migrated"] > 0
        assert result["stats"]["csv_amount_sum"] == result["stats"]["db_amount_sum"]

        # Check that transactions table is queryable with index
        rows = db.fetchall("SELECT id, amount_cents FROM transactions ORDER BY date DESC LIMIT 10")
        assert len(rows) == 10
        assert all(isinstance(r["amount_cents"], int) for r in rows)


def test_backup_manager_vacuum_into():
    """Verifies that BackupManager creates an uncorrupted snapshot with valid SHA-256."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        db_path = Path(tmp_dir) / "openfamilyoffice.db"
        backup_dir = Path(tmp_dir) / "backups"
        db = DatabaseManager(db_path)

        with db.transaction() as conn:
            conn.execute(
                "INSERT INTO accounts (id, name, entity_code, balance_cents) VALUES (?, ?, ?, ?)",
                ("acc_bck_1", "Backup Account", "FIX_SERVICOS", 250000),
            )

        mgr = BackupManager(data_dir=Path(tmp_dir), backup_dir=backup_dir)
        info = mgr.create_backup("test")

        assert info["status"] == "CREATED"
        backup_file = Path(info["backup_file"])
        assert backup_file.exists()
        assert mgr.verify_backup(backup_file) is True

        # Open the backup directly and verify content
        backup_db = DatabaseManager(backup_file)
        row = backup_db.fetchone("SELECT * FROM accounts WHERE id = ?", ("acc_bck_1",))
        assert row is not None
        assert row["balance_cents"] == 250000
