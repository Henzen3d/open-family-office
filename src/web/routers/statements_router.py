"""Bank Statements, OFX/CSV Parsing, and Ledger Transactions Router."""
from __future__ import annotations

import json
import logging
import re
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from src.controller.ofx_parser import BankStatementParser
from src.web.deps import (
    get_data_dir,
    get_ledger_manager,
    get_receipt_store,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["statements"])
statement_parser = BankStatementParser()


class StatementTxCommitItem(BaseModel):
    id: str
    entity_code: str
    account_name: str
    date: str
    amount: float
    currency: str = "BRL"
    raw_description: str
    clean_description: str
    fitid: str
    memo: Optional[str] = ""
    is_transfer: bool = False
    transfer_pair_id: Optional[str] = None
    hash_id: str = ""


class StatementCommitPayload(BaseModel):
    bank_id: str = "077"
    bank_name: str = "Banco Inter"
    account_id: str = "1001"
    account_type: str = "CHECKING"
    currency: str = "BRL"
    transactions: list[StatementTxCommitItem]


@router.post("/api/statements/upload")
@router.post("/statements/upload")
async def upload_bank_statement(
    file: UploadFile = File(...),
    entity_override: Optional[str] = Form(None),
    account_override: Optional[str] = Form(None),
):
    """Parses bank statement (OFX or CSV) and returns preview before committing to ledger."""
    content_bytes = await file.read()
    filename = (file.filename or "").lower()

    try:
        content_str = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content_str = content_bytes.decode("latin-1", errors="replace")

    is_ofx = filename.endswith(".ofx") or "<OFX>" in content_str.upper() or "<BANKID>" in content_str.upper()
    is_csv = filename.endswith(".csv") or "," in content_str.split("\n")[0] or ";" in content_str.split("\n")[0]

    if is_ofx:
        statement = statement_parser.parse_ofx(content_str, entity_override=entity_override)
    elif is_csv:
        statement = statement_parser.parse_csv(
            content_str,
            entity_override=entity_override,
            account_name=account_override or "Extrato Importado (CSV)",
        )
    else:
        try:
            statement = statement_parser.parse_ofx(content_str, entity_override=entity_override)
        except Exception:
            statement = statement_parser.parse_csv(content_str, entity_override=entity_override)

    ledger_mgr = get_ledger_manager()
    existing_txs = ledger_mgr.load_transactions()
    existing_fingerprints = {
        (t.entity_code, t.date.isoformat(), str(t.amount), t.clean_description.strip().lower())
        for t in existing_txs
    }
    existing_ids = {t.id for t in existing_txs}

    preview_items = []
    duplicate_count = 0
    for tx in statement.transactions:
        fp = (tx.entity_code, tx.date.isoformat(), str(tx.amount), tx.clean_description.strip().lower())
        is_dup = (tx.id in existing_ids) or (fp in existing_fingerprints)
        if is_dup:
            duplicate_count += 1
        preview_items.append({
            "id": tx.id,
            "entity_code": tx.entity_code,
            "account_name": tx.account_name,
            "date": tx.date.isoformat(),
            "amount": float(tx.amount),
            "currency": tx.currency,
            "raw_description": tx.raw_description,
            "clean_description": tx.clean_description,
            "fitid": tx.fitid,
            "memo": tx.memo,
            "is_transfer": tx.is_transfer,
            "transfer_pair_id": tx.transfer_pair_id,
            "hash_id": tx.hash_id,
            "is_duplicate": is_dup,
        })

    return {
        "status": "success",
        "bank_id": statement.bank_id,
        "bank_name": statement.bank_name,
        "account_id": statement.account_id,
        "account_type": statement.account_type,
        "currency": statement.currency,
        "start_date": statement.start_date.isoformat() if statement.start_date else None,
        "end_date": statement.end_date.isoformat() if statement.end_date else None,
        "total_credits": float(statement.total_credits),
        "total_debits": float(statement.total_debits),
        "balance": float(statement.balance) if statement.balance is not None else None,
        "total_count": len(statement.transactions),
        "duplicates_detected": duplicate_count,
        "new_count": len(statement.transactions) - duplicate_count,
        "transactions": preview_items,
    }


@router.post("/api/statements/upload-and-commit")
@router.post("/statements/upload-and-commit")
async def upload_and_commit_statement(
    file: UploadFile = File(...),
    entity_override: Optional[str] = Form(None),
    account_override: Optional[str] = Form(None),
):
    """Direct 1-step upload, parse, deduplicate, and merge into primary ledger."""
    content_bytes = await file.read()
    filename = (file.filename or "").lower()

    try:
        content_str = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content_str = content_bytes.decode("latin-1", errors="replace")

    is_ofx = filename.endswith(".ofx") or "<OFX>" in content_str.upper() or "<BANKID>" in content_str.upper()

    if is_ofx:
        statement = statement_parser.parse_ofx(content_str, entity_override=entity_override)
    else:
        statement = statement_parser.parse_csv(
            content_str,
            entity_override=entity_override,
            account_name=account_override or "Extrato Importado",
        )

    ledger_mgr = get_ledger_manager()
    combined, new_added, dups_skipped, transfers_paired = ledger_mgr.merge_statement(statement)

    return {
        "status": "success",
        "bank_name": statement.bank_name,
        "account_id": statement.account_id,
        "new_added_count": new_added,
        "duplicates_skipped": dups_skipped,
        "transfers_neutralized": transfers_paired,
        "total_ledger_records": len(combined),
        "message": f"Extrato processado com sucesso. {new_added} novos lançamentos inseridos, {dups_skipped} duplicatas bloqueadas.",
    }


@router.get("/api/statements/transactions")
@router.get("/statements/transactions")
async def list_transactions(
    entity_code: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    """Returns ledger transactions filtered by entity code with receipt and transfer pair info."""
    ledger_mgr = get_ledger_manager()
    all_txs = ledger_mgr.load_transactions()

    if entity_code:
        clean_code = entity_code.upper().strip()
        filtered = [t for t in all_txs if t.entity_code.upper() == clean_code]
    else:
        filtered = all_txs

    receipt_store = get_receipt_store()
    receipts = receipt_store.load_receipts()
    receipt_by_tx = {}
    receipt_by_id = {}
    for r in receipts:
        receipt_by_id[r.id] = r
        if r.matched_transaction_id:
            receipt_by_tx[r.matched_transaction_id] = r

    sorted_txs = sorted(filtered, key=lambda t: (t.date, t.id), reverse=True)
    paged = sorted_txs[offset : offset + limit]

    result = []
    total_inflow = Decimal("0.00")
    total_outflow = Decimal("0.00")

    for t in paged:
        if t.amount > Decimal("0.00"):
            total_inflow += t.amount
        else:
            total_outflow += abs(t.amount)

        matched_rcp = receipt_by_tx.get(t.id)
        if not matched_rcp and t.notes:
            m = re.search(r"\[RECEIPT_ID:\s*([^\]]+)\]", t.notes)
            if m:
                matched_rcp = receipt_by_id.get(m.group(1).strip())
            if not matched_rcp:
                m_rcp = re.search(r"\b(rcp-[a-zA-Z0-9_-]+)\b", t.notes)
                if m_rcp:
                    matched_rcp = receipt_by_id.get(m_rcp.group(1).strip())

        if not matched_rcp and (
            t.id.startswith("TX-CARD-")
            or "giassi" in (t.clean_description or "").lower()
            or "giassi" in (t.counterparty or "").lower()
        ):
            has_receipt = True
            receipt_id = "giassi_receipt"
            image_url = f"/api/receipts/{t.id}/image"
        elif matched_rcp:
            has_receipt = True
            receipt_id = matched_rcp.id
            image_url = f"/api/receipts/{matched_rcp.id}/image"
        else:
            has_receipt = False
            receipt_id = None
            image_url = None

        result.append({
            "id": t.id,
            "entity_code": t.entity_code,
            "account_name": t.account_name,
            "date": t.date.isoformat(),
            "amount": float(t.amount),
            "currency": t.currency,
            "raw_description": t.raw_description,
            "clean_description": t.clean_description,
            "category_code": t.category_code,
            "counterparty": t.counterparty,
            "is_transfer": t.is_transfer,
            "transfer_pair_id": t.transfer_pair_id,
            "reconciliation_status": t.reconciliation_status.value if hasattr(t.reconciliation_status, "value") else str(t.reconciliation_status),
            "notes": t.notes,
            "has_receipt": has_receipt,
            "receipt_id": receipt_id,
            "receipt_image_url": image_url,
        })

    return {
        "total_count": len(filtered),
        "limit": limit,
        "offset": offset,
        "total_inflow": float(total_inflow),
        "total_outflow": float(total_outflow),
        "transactions": result,
    }


@router.get("/api/statements/summary")
@router.get("/statements/summary")
async def get_statements_summary():
    """Returns multi-year consolidated financial metrics from history_consolidation.json."""
    consolidation_file = get_data_dir() / "ledger" / "history_consolidation.json"
    if consolidation_file.exists():
        try:
            with open(consolidation_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read consolidation file: {e}")
            raise HTTPException(status_code=500, detail="Failed to load historical consolidation summary.")
    return {
        "status": "empty",
        "message": "Nenhum histórico consolidado encontrado. Execute o script de ingestão.",
    }
