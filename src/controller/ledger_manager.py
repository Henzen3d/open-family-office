"""Ledger Manager for reading, writing, and deduplicating transactions in the primary CSV ledger."""
import csv
from datetime import datetime, date
from decimal import Decimal
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from src.models.transactions import Transaction
from src.models.enums import ReconciliationStatus
from src.controller.ofx_parser import ParsedStatement, ParsedBankTransaction
from src.controller.transfer_neutralizer import TransferNeutralizer
from src.controller.card_reconciler import CardReconciler


LEDGER_CSV_HEADER = [
    "id",
    "entity_code",
    "account_name",
    "date",
    "amount",
    "currency",
    "raw_description",
    "clean_description",
    "category_code",
    "counterparty",
    "is_transfer",
    "transfer_pair_id",
    "reconciliation_status",
    "notes",
]


class LedgerManager:
    """Orchestrates persistent transactions storage, deduplication, and reconciliation."""

    def __init__(self, ledger_file: Optional[str] = None, templates_fallback: Optional[str] = None):
        if ledger_file:
            self.ledger_path = Path(ledger_file)
        else:
            data_dir = Path(os.getenv("DATA_DIR", "data"))
            self.ledger_path = data_dir / "ledger" / "transactions.csv"

        self.templates_fallback = Path(templates_fallback) if templates_fallback else None
        self.transfer_neutralizer = TransferNeutralizer()
        self.card_reconciler = CardReconciler()
        self._ensure_ledger_file()

    def _ensure_ledger_file(self):
        """Initializes transactions.csv with header if file does not exist."""
        if not self.ledger_path.exists():
            self.ledger_path.parent.mkdir(parents=True, exist_ok=True)
            if self.templates_fallback and self.templates_fallback.exists():
                # Copy initial template transactions
                with open(self.templates_fallback, "r", encoding="utf-8") as f_src:
                    content = f_src.read()
                with open(self.ledger_path, "w", encoding="utf-8", newline="") as f_dst:
                    f_dst.write(content)
            else:
                # Write empty header
                with open(self.ledger_path, "w", encoding="utf-8", newline="") as f:
                    writer = csv.writer(f)
                    writer.writerow(LEDGER_CSV_HEADER)

    def load_transactions(self) -> List[Transaction]:
        """Loads all transactions from the active ledger CSV."""
        self._ensure_ledger_file()
        transactions: List[Transaction] = []
        if not self.ledger_path.exists():
            return transactions

        with open(self.ledger_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if not row or not row.get("id"):
                    continue
                try:
                    tx_date = datetime.strptime(row["date"].strip(), "%Y-%m-%d").date()
                except ValueError:
                    continue

                amount_str = row.get("amount", "0.00").replace(",", ".")
                amount = Decimal(amount_str)
                is_trf = row.get("is_transfer", "false").strip().lower() in ("true", "1", "t")
                status = row.get("reconciliation_status", "CONFIRMED").strip()

                tx = Transaction(
                    id=row["id"].strip(),
                    entity_code=row.get("entity_code", "HOUSEHOLD_OSMAR").strip(),
                    account_name=row.get("account_name", "Checking").strip(),
                    date=tx_date,
                    amount=amount,
                    currency=row.get("currency", "BRL").strip(),
                    raw_description=row.get("raw_description", "").strip(),
                    clean_description=row.get("clean_description", "").strip(),
                    category_code=row.get("category_code", "").strip(),
                    counterparty=row.get("counterparty", "").strip(),
                    is_transfer=is_trf,
                    transfer_pair_id=row.get("transfer_pair_id") or None,
                    reconciliation_status=ReconciliationStatus(status) if status in ReconciliationStatus._value2member_map_ else ReconciliationStatus.CONFIRMED,
                    notes=row.get("notes", "").strip(),
                )
                transactions.append(tx)
        return transactions

    def save_transactions(self, transactions: List[Transaction]):
        """Persists transaction collection back to CSV with consistent sorting."""
        self.ledger_path.parent.mkdir(parents=True, exist_ok=True)
        # Sort by date descending, then id
        sorted_txs = sorted(transactions, key=lambda t: (t.date, t.id), reverse=True)

        with open(self.ledger_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(LEDGER_CSV_HEADER)
            for tx in sorted_txs:
                writer.writerow([
                    tx.id,
                    tx.entity_code,
                    tx.account_name,
                    tx.date.isoformat(),
                    str(tx.amount),
                    tx.currency,
                    tx.raw_description,
                    tx.clean_description,
                    tx.category_code,
                    tx.counterparty,
                    "true" if tx.is_transfer else "false",
                    tx.transfer_pair_id or "",
                    tx.reconciliation_status.value if hasattr(tx.reconciliation_status, "value") else str(tx.reconciliation_status),
                    tx.notes,
                ])

    @staticmethod
    def compute_fingerprint(entity_code: str, tx_date: Any, amount: Any, description: str) -> str:
        """Computes a normalized business idempotency fingerprint: (entity_code, date, amount_cents, description)."""
        d_str = tx_date.isoformat() if hasattr(tx_date, "isoformat") else str(tx_date).strip()
        amt_str = str(amount).replace(",", ".").strip()
        try:
            amt_cents = int(round(Decimal(amt_str) * 100))
        except Exception:
            amt_cents = 0
        desc_norm = (description or "").strip().lower()
        ent_norm = (entity_code or "").strip().upper()
        return f"{ent_norm}|{d_str}|{amt_cents}|{desc_norm}"

    def get_transaction_fingerprint(self, tx: Transaction) -> str:
        """Returns the business fingerprint for a given Transaction."""
        desc = tx.clean_description or tx.raw_description or ""
        return self.compute_fingerprint(tx.entity_code, tx.date, tx.amount, desc)

    def deduplicate_ledger(self) -> int:
        """Purges duplicate rows from the active ledger CSV based on ID and business fingerprint.
        Returns the number of duplicate transactions removed.
        """
        existing = self.load_transactions()
        seen_ids = set()
        seen_fps = set()
        unique_txs: List[Transaction] = []
        removed = 0

        for tx in existing:
            fp = self.get_transaction_fingerprint(tx)
            if tx.id in seen_ids or fp in seen_fps:
                removed += 1
                continue
            seen_ids.add(tx.id)
            seen_fps.add(fp)
            unique_txs.append(tx)

        if removed > 0:
            self.save_transactions(unique_txs)
        return removed

    def merge_statement(
        self,
        statement: ParsedStatement,
        category_map: Optional[Dict[str, str]] = None,
    ) -> Tuple[List[Transaction], int, int, int]:
        """Ingests a parsed bank statement, deduplicating against existing entries and neutralizing transfers.
        Returns:
            (updated_transactions, new_added_count, duplicates_skipped, transfers_neutralized)
        """
        existing = self.load_transactions()
        existing_ids = {t.id for t in existing}
        existing_fingerprints = {self.get_transaction_fingerprint(t) for t in existing}

        new_txs: List[Transaction] = []
        duplicates_skipped = 0

        for pt in statement.transactions:
            # Check duplicate by ID
            if pt.id in existing_ids:
                duplicates_skipped += 1
                continue

            # Check duplicate by business fingerprint
            pt_desc = pt.clean_description or pt.raw_description or ""
            fp = self.compute_fingerprint(pt.entity_code, pt.date, pt.amount, pt_desc)
            if fp in existing_fingerprints:
                duplicates_skipped += 1
                continue

            # Determine category
            category = "UNCATEGORIZED"
            if category_map:
                for keyword, cat_code in category_map.items():
                    if keyword.lower() in pt.clean_description.lower():
                        category = cat_code
                        break

            tx = Transaction(
                id=pt.id,
                entity_code=pt.entity_code,
                account_name=pt.account_name,
                date=pt.date,
                amount=pt.amount,
                currency=pt.currency,
                raw_description=pt.raw_description,
                clean_description=pt.clean_description,
                category_code=category,
                counterparty=pt.memo or pt.raw_description,
                is_transfer=pt.is_transfer,
                transfer_pair_id=pt.transfer_pair_id,
                reconciliation_status=ReconciliationStatus.CONFIRMED,
                notes=f"[OFX_FITID: {pt.fitid}] Hash: {pt.hash_id}",
            )
            new_txs.append(tx)
            existing_ids.add(tx.id)
            existing_fingerprints.add(fp)

        combined = existing + new_txs

        # Neutralize card invoice settlements
        combined, card_reconciled = self.card_reconciler.reconcile_card_payments(combined)

        # Neutralize internal transfers between accounts (e.g. Inter PJ -> Nubank PF)
        combined, paired_transfers = self.transfer_neutralizer.match_transfers(combined)

        # Save to disk
        self.save_transactions(combined)

        return combined, len(new_txs), duplicates_skipped, len(paired_transfers)

    def add_single_transaction(self, tx: Transaction) -> bool:
        """Appends a single verified transaction to the ledger, enforcing idempotency."""
        existing = self.load_transactions()
        if any(t.id == tx.id for t in existing):
            return False

        tx_fp = self.get_transaction_fingerprint(tx)
        if any(self.get_transaction_fingerprint(t) == tx_fp for t in existing):
            return False

        existing.append(tx)
        existing, _ = self.transfer_neutralizer.match_transfers(existing)
        self.save_transactions(existing)
        return True
