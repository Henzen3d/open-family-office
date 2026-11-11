"""Conversational AI Assistant and Card Confirmation Router."""
from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from src.models.transactions import Transaction
from src.models.enums import ReconciliationStatus
from src.web.deps import (
    get_data_dir,
    get_smart_router,
    get_general_settings,
    get_ledger_manager,
    get_receipt_store,
)
from src.web.routers.receipts_router import apply_receipt_correction

router = APIRouter(tags=["chat"])


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    context_entity: Optional[str] = Field(default=None, description="Optional entity tag, e.g. inter_cnpj, nubank_pf")
    stream: bool = Field(default=True, description="Whether to stream via SSE")
    asd_mode: Optional[str] = Field(default=None, description="Optional ASD mode: 'none', 'asd_80', 'asd_strict'")


class ConfirmCardRequest(BaseModel):
    card_id: str
    amount: float
    date: str
    counterparty: str
    category: str
    entity_code: str
    account_name: str
    notes: Optional[str] = None
    corrects_receipt: Optional[str] = Field(default=None, description="Receipt id or image filename stem being corrected by this confirmation")
    card_type: Optional[str] = Field(default=None, description="Card type: EXPENSE_CONFIRMATION or CORRECTION_CONFIRMATION")


@router.post("/api/chat")
async def chat_endpoint(request: ChatMessageRequest):
    """Chat endpoint supporting SSE streaming and Smart Auto-Routing across active LLMs."""
    smart_router = get_smart_router()
    configured_asd = request.asd_mode
    if not configured_asd:
        gen = await get_general_settings()
        configured_asd = gen.get("asd_mode", "asd_80")

    result = smart_router.execute_chat(
        request.message,
        entity_context=request.context_entity,
        asd_mode=configured_asd,
    )

    if request.stream:
        async def stream_generator() -> AsyncGenerator[str, None]:
            event_id = 1
            yield f"id: {event_id}\ndata: {json.dumps({'type': 'start', 'timestamp': datetime.now(timezone.utc).isoformat()}, ensure_ascii=False)}\n\n"
            words = result["reply"].split(" ")
            for i in range(0, len(words), 3):
                event_id += 1
                chunk = " ".join(words[i : i + 3]) + " "
                yield f"id: {event_id}\ndata: {json.dumps({'type': 'chunk', 'text': chunk}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.04)
            yield f"id: {event_id + 1}\ndata: {json.dumps({'type': 'done', 'provider': result.get('provider'), 'model': result.get('model'), 'latency_ms': result.get('latency_ms'), 'confirmation_card': result.get('confirmation_card'), 'asd_mode': result.get('asd_mode'), 'status': 'completed'}, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            stream_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    return {
        "reply": result["reply"],
        "received": request.message,
        "entity": request.context_entity,
        "provider": result.get("provider"),
        "model": result.get("model"),
        "latency_ms": result.get("latency_ms"),
        "intent": result.get("intent"),
        "confirmation_card": result.get("confirmation_card"),
        "sanitized": True,
        "asd_mode": result.get("asd_mode"),
    }


@router.post("/api/ledger/confirm-card")
@router.post("/ledger/confirm-card")
async def confirm_ledger_card(request: ConfirmCardRequest):
    """Commits an interactive confirmation card into the permanent ledger (Phase 8)."""
    if (
        request.card_type == "CORRECTION_CONFIRMATION"
        and request.corrects_receipt
        and request.amount > 0
    ):
        result = await apply_receipt_correction(
            receipt_ref=request.corrects_receipt,
            total_amount=abs(request.amount),
            note=f"correção via chat card {request.card_id}",
            source="manual_chat",
        )
        if result is not None:
            result["status"] = "CORRECTED"
            result["card_id"] = request.card_id
            result["audit_file"] = str(get_data_dir() / "governance" / "receipt_corrections.jsonl")
            return result
        return {
            "status": "RECEIPT_NOT_FOUND",
            "card_id": request.card_id,
            "corrects_receipt": request.corrects_receipt,
            "message": "Recibo não encontrado; nada foi registrado.",
        }

    ledger_mgr = get_ledger_manager()
    tx_id = f"TX-CARD-{int(time.time() * 1000)}"
    try:
        tx_date = datetime.strptime(request.date, "%Y-%m-%d").date()
    except ValueError:
        tx_date = datetime.now().date()

    new_tx = Transaction(
        id=tx_id,
        entity_code=request.entity_code,
        account_name=request.account_name,
        date=tx_date,
        amount=Decimal(str(-abs(request.amount))),
        currency="BRL",
        raw_description=f"Compra confirmada via Assistente: {request.counterparty}",
        clean_description=f"Compra {request.counterparty} ({request.category})",
        category_code=request.category,
        counterparty=request.counterparty,
        is_transfer=False,
        reconciliation_status=ReconciliationStatus.CONFIRMED,
        notes=request.notes or f"Lançamento aprovado no card {request.card_id}",
    )

    existing = ledger_mgr.load_transactions()
    existing.insert(0, new_tx)
    ledger_mgr.save_transactions(existing)

    receipt_correction = None
    if request.corrects_receipt:
        store = get_receipt_store()
        receipts = store.load_receipts()
        target_ref = request.corrects_receipt
        rcp = next((r for r in receipts if r.id == target_ref), None)
        if rcp is None:
            rcp = next((r for r in receipts if target_ref in r.image_storage_path or Path(r.image_storage_path).stem == target_ref.split(".")[0]), None)
        if rcp:
            rcp.matched_transaction_id = tx_id
            if abs(request.amount) > 0:
                rcp.total_amount = Decimal(str(abs(request.amount))).quantize(Decimal("0.01"))
            store.save_receipt(rcp)
        receipt_correction = await apply_receipt_correction(
            receipt_ref=request.corrects_receipt,
            total_amount=abs(request.amount),
            note=f"confirmação via chat card {request.card_id}",
            source="manual_chat",
        )

    return {
        "status": "CONFIRMED",
        "card_id": request.card_id,
        "transaction_id": tx_id,
        "transaction": {
            "id": tx_id,
            "date": tx_date.isoformat(),
            "entity_code": request.entity_code,
            "account_name": request.account_name,
            "clean_description": new_tx.clean_description,
            "counterparty": request.counterparty,
            "amount": -abs(request.amount),
            "is_transfer": False,
            "notes": new_tx.notes,
            "status": "CONFIRMED",
        },
        "receipt_correction": receipt_correction,
        "message": f"Lançamento de R$ {request.amount:,.2f} registrado com sucesso no Livro Razão.",
    }
