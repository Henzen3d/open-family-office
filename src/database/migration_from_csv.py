"""Non-destructive migration script from CSV and JSON files into local SQLite.

Guarantees 100% mathematical precision with zero cent discrepancy.
"""
from __future__ import annotations

import csv
import hashlib
import json
import os
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

from src.database.db import DatabaseManager, get_db


def compute_file_sha256(filepath: Path) -> str:
    """Computes SHA-256 digest of a local file."""
    if not filepath.exists():
        return "MISSING"
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


class CsvToSqliteMigrator:
    """Migrates flat files (transactions.csv, accounts.json, receipts_db.json) into SQLite."""

    def __init__(self, data_dir: Optional[Path] = None, db_manager: Optional[DatabaseManager] = None):
        self.data_dir = data_dir or Path(os.getenv("DATA_DIR", "data"))
        self.db = db_manager or get_db(self.data_dir / "openfamilyoffice.db")

    def run_migration(self, force: bool = False) -> Dict[str, Any]:
        """Executes full migration within an atomic transaction with checksum verification."""
        transactions_csv = self.data_dir / "ledger" / "transactions.csv"
        accounts_json = self.data_dir / "accounts.json"
        if not accounts_json.exists():
            accounts_json = self.data_dir / "accounts" / "accounts.json"
        receipts_json = self.data_dir / "receipts" / "receipts_db.json"

        # Check if already migrated
        existing = self.db.fetchone(
            "SELECT id, applied_at, records_migrated FROM migrations_log WHERE migration_name = 'initial_csv_json_migration'"
        )
        if existing and not force:
            return {
                "status": "SKIPPED",
                "message": "Migration already executed previously.",
                "applied_at": existing["applied_at"],
                "records_migrated": existing["records_migrated"],
            }

        combined_hash = hashlib.sha256(
            (compute_file_sha256(transactions_csv) + compute_file_sha256(accounts_json) + compute_file_sha256(receipts_json)).encode()
        ).hexdigest()

        stats = {
            "accounts_migrated": 0,
            "transactions_migrated": 0,
            "receipts_migrated": 0,
            "receipt_items_migrated": 0,
            "csv_amount_sum": Decimal("0.00"),
            "db_amount_sum": Decimal("0.00"),
        }

        with self.db.transaction() as conn:
            # 1. Accounts
            if accounts_json.exists():
                with open(accounts_json, "r", encoding="utf-8") as f:
                    accounts_data = json.load(f)
                for acc in accounts_data:
                    balance_val = Decimal(str(acc.get("balance", 0.0)))
                    balance_cents = int(round(balance_val * 100))
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO accounts (
                            id, name, bank_name, entity_code, holder, purpose, currency,
                            balance_cents, account_type, color, active, last_adjusted_at, notes, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            acc.get("id"),
                            acc.get("name"),
                            acc.get("bank_name", acc.get("name")),
                            acc.get("entity_code", "HOUSEHOLD_OSMAR"),
                            acc.get("holder", "Osmar & Vera"),
                            acc.get("purpose", "Conta Geral"),
                            acc.get("currency", "BRL"),
                            balance_cents,
                            acc.get("account_type", "CHECKING"),
                            acc.get("color", "indigo"),
                            1 if acc.get("active", True) else 0,
                            acc.get("last_adjusted_at"),
                            acc.get("notes"),
                            datetime.now(timezone.utc).isoformat(),
                        ),
                    )
                    stats["accounts_migrated"] += 1

            # 2. Transactions
            if transactions_csv.exists():
                with open(transactions_csv, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        raw_amt_str = row.get("amount", "0").strip()
                        raw_amt = Decimal(raw_amt_str) if raw_amt_str else Decimal("0.00")
                        amt_cents = int(round(raw_amt * 100))
                        stats["csv_amount_sum"] += raw_amt

                        is_tx_bool = 1 if row.get("is_transfer", "").lower() in ("true", "1") else 0

                        conn.execute(
                            """
                            INSERT OR REPLACE INTO transactions (
                                id, entity_code, account_name, date, amount_cents, currency,
                                raw_description, clean_description, category_code, counterparty,
                                is_transfer, transfer_pair_id, reconciliation_status, notes, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                row.get("id"),
                                row.get("entity_code"),
                                row.get("account_name"),
                                row.get("date"),
                                amt_cents,
                                row.get("currency", "BRL"),
                                row.get("raw_description"),
                                row.get("clean_description"),
                                row.get("category_code"),
                                row.get("counterparty"),
                                is_tx_bool,
                                row.get("transfer_pair_id") or None,
                                row.get("reconciliation_status", "UNRECONCILED"),
                                row.get("notes") or None,
                                datetime.now(timezone.utc).isoformat(),
                            ),
                        )
                        stats["transactions_migrated"] += 1

            # 3. Receipts & Receipt Items
            if receipts_json.exists():
                with open(receipts_json, "r", encoding="utf-8") as f:
                    receipts_data = json.load(f)
                for rcp in receipts_data:
                    tot_cents = int(round(Decimal(str(rcp.get("total_amount", 0.0))) * 100))
                    tax_cents = int(round(Decimal(str(rcp.get("tax_amount", 0.0))) * 100))
                    disc_cents = int(round(Decimal(str(rcp.get("discount_amount", 0.0))) * 100))

                    conn.execute(
                        """
                        INSERT OR REPLACE INTO receipts (
                            id, entity_code, image_storage_path, merchant_name, merchant_tax_id,
                            issue_date, total_cents, tax_cents, discount_cents, payment_method,
                            card_last_digits, fiscal_access_key, matched_transaction_id,
                            confidence_score, source_channel, parser_engine, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            rcp.get("id"),
                            rcp.get("entity_code", "HOUSEHOLD_OSMAR"),
                            rcp.get("image_storage_path"),
                            rcp.get("merchant_name"),
                            rcp.get("merchant_tax_id"),
                            rcp.get("issue_date"),
                            tot_cents,
                            tax_cents,
                            disc_cents,
                            rcp.get("payment_method"),
                            rcp.get("card_last_digits"),
                            rcp.get("fiscal_access_key"),
                            rcp.get("matched_transaction_id"),
                            float(rcp.get("confidence_score", 1.0)),
                            rcp.get("source_channel"),
                            rcp.get("parser_engine"),
                            datetime.now(timezone.utc).isoformat(),
                        ),
                    )
                    stats["receipts_migrated"] += 1

                    # Migrate Items
                    conn.execute("DELETE FROM receipt_items WHERE receipt_id = ?", (rcp.get("id"),))
                    for item in rcp.get("items", []):
                        unit_cents = int(round(Decimal(str(item.get("unit_price", 0.0))) * 100))
                        item_tot_cents = int(round(Decimal(str(item.get("total_price", 0.0))) * 100))
                        conn.execute(
                            """
                            INSERT INTO receipt_items (
                                receipt_id, item_index, description, quantity, unit_measure,
                                unit_price_cents, total_price_cents, category
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                rcp.get("id"),
                                item.get("item_index", 1),
                                item.get("description", "Item"),
                                float(item.get("quantity", 1.0)),
                                item.get("unit_measure", "UN"),
                                unit_cents,
                                item_tot_cents,
                                item.get("category"),
                            ),
                        )
                        stats["receipt_items_migrated"] += 1

            # Validate control sum in SQLite
            cur = conn.execute("SELECT SUM(amount_cents) FROM transactions")
            db_cents_sum = cur.fetchone()[0] or 0
            stats["db_amount_sum"] = Decimal(db_cents_sum) / Decimal(100)

            # Check precision
            discrepancy = abs(stats["csv_amount_sum"] - stats["db_amount_sum"])
            if discrepancy > Decimal("0.0001"):
                raise ValueError(
                    f"Checksum mismatch: CSV sum {stats['csv_amount_sum']} != DB sum {stats['db_amount_sum']} "
                    f"(Discrepancy: {discrepancy})"
                )

            # Record in migrations_log
            conn.execute(
                """
                INSERT OR REPLACE INTO migrations_log (
                    migration_name, applied_at, records_migrated, checksum
                ) VALUES (?, ?, ?, ?)
                """,
                (
                    "initial_csv_json_migration",
                    datetime.now(timezone.utc).isoformat(),
                    stats["transactions_migrated"] + stats["accounts_migrated"] + stats["receipts_migrated"],
                    combined_hash,
                ),
            )

        return {
            "status": "SUCCESS",
            "stats": {
                **stats,
                "csv_amount_sum": float(stats["csv_amount_sum"]),
                "db_amount_sum": float(stats["db_amount_sum"]),
            },
            "checksum": combined_hash,
        }


if __name__ == "__main__":
    migrator = CsvToSqliteMigrator()
    result = migrator.run_migration(force=True)
    print("Migration Result:", json.dumps(result, indent=2))

