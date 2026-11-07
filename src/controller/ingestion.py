"""CSV ingestion module for entities, categories, and transactions."""
import csv
from datetime import datetime
from decimal import Decimal
from typing import Dict, List

from src.models.entities import Entity
from src.models.categories import Category
from src.models.transactions import Transaction
from src.models.enums import EntityType, CategoryScope, ReconciliationStatus


def parse_decimal(value: str) -> Decimal:
    """Safely parse decimal from string, handling currency symbols and commas."""
    if not value:
        return Decimal("0.00")
    cleaned = value.strip().replace("R$", "").replace("$", "").replace(" ", "")
    # Check if comma is used as decimal separator (Brazilian format e.g. 1.250,50)
    if "," in cleaned and "." in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")
    return Decimal(cleaned)


def load_entities_csv(filepath: str) -> Dict[str, Entity]:
    """Loads entities from entities_template.csv into an entity_code -> Entity dictionary."""
    entities: Dict[str, Entity] = {}
    with open(filepath, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = row["entity_code"].strip()
            entity = Entity(
                entity_code=code,
                legal_name=row["legal_name"].strip(),
                trade_name=row["trade_name"].strip(),
                entity_type=EntityType(row["entity_type"].strip()),
                tax_id_masked=row["tax_id_masked"].strip(),
                jurisdiction=row.get("jurisdiction", "BR").strip(),
                primary_currency=row.get("primary_currency", "BRL").strip(),
                owner_principal=row.get("owner_principal", "").strip(),
                active=row.get("active", "true").strip().lower() == "true",
                notes=row.get("notes", "").strip(),
            )
            entities[code] = entity
    return entities


def load_categories_csv(filepath: str) -> Dict[str, Category]:
    """Loads chart of accounts from categories_template.csv."""
    categories: Dict[str, Category] = {}
    with open(filepath, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = row["category_code"].strip()
            cat = Category(
                category_code=code,
                name=row["name"].strip(),
                scope=CategoryScope(row["scope"].strip()),
                parent_category=row.get("parent_category") or None,
                is_essential=row.get("is_essential", "false").strip().lower() == "true",
                description=row.get("description", "").strip(),
            )
            categories[code] = cat
    return categories


def load_transactions_csv(filepath: str) -> List[Transaction]:
    """Loads transactions from transactions_template.csv."""
    transactions: List[Transaction] = []
    with open(filepath, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            tx_date = datetime.strptime(row["date"].strip(), "%Y-%m-%d").date()
            amount = parse_decimal(row["amount"])
            is_trf = row.get("is_transfer", "false").strip().lower() == "true"
            status_str = row.get("reconciliation_status", "CONFIRMED").strip()
            
            tx = Transaction(
                id=row["id"].strip(),
                entity_code=row["entity_code"].strip(),
                account_name=row["account_name"].strip(),
                date=tx_date,
                amount=amount,
                currency=row.get("currency", "BRL").strip(),
                raw_description=row.get("raw_description", "").strip(),
                clean_description=row.get("clean_description", "").strip(),
                category_code=row.get("category_code", "").strip(),
                counterparty=row.get("counterparty", "").strip(),
                is_transfer=is_trf,
                transfer_pair_id=row.get("transfer_pair_id") or None,
                reconciliation_status=ReconciliationStatus(status_str),
                notes=row.get("notes", "").strip(),
            )
            transactions.append(tx)
    return transactions
