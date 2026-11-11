"""Conversational AI Assistant and Card Confirmation Router."""
from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import AsyncGenerator, Optional, Any, Dict

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


def _extract_interactive_artifact(reply_text: str, user_query: str) -> tuple[str, Optional[dict[str, Any]]]:
    """Parses delimited ```artifact:type {json}``` blocks or triggers simulation artifacts."""
    import re
    pattern = r"```artifact:([a-z_]+)\s*(\{.*?\})\s*```"
    match = re.search(pattern, reply_text, re.DOTALL)
    if match:
        art_type = match.group(1)
        try:
            payload = json.loads(match.group(2))
            clean_reply = re.sub(pattern, "", reply_text, flags=re.DOTALL).strip()
            title_map = {
                "compound_interest": "Calculadora de Juros Compostos",
                "purchase_opportunity": "Custo de Oportunidade & Compra",
                "real_vs_nominal": "Rentabilidade Real vs Nominal (Fisher)",
                "mortgage_vs_rent": "Financiamento vs Aluguel",
            }
            return clean_reply, {
                "id": f"ART-{int(time.time() * 1000)}",
                "artifact_type": art_type,
                "title": title_map.get(art_type, "Simulação Interativa"),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "payload": payload,
            }
        except Exception:
            pass

    q = user_query.lower()
    if any(k in q for k in ["juros composto", "juros compostos", "simular investimento", "quanto rende", "aporte mensal"]):
        from src.intelligence.assistant_tools import calculate_compound_interest_series
        calc = calculate_compound_interest_series(5000, 500, 11.25, 15)
        return reply_text, {
            "id": f"ART-{int(time.time() * 1000)}",
            "artifact_type": "compound_interest",
            "title": "Calculadora de Juros Compostos",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "payload": calc,
        }
    elif any(k in q for k in ["vale a pena comprar", "custo de oportunidade", "parcelar ou", "à vista ou parcelado"]):
        from src.intelligence.assistant_tools import calculate_opportunity_cost
        calc = calculate_opportunity_cost(5000, 11.25, [2, 5, 10, 20], "Decisão de Compra")
        return reply_text, {
            "id": f"ART-{int(time.time() * 1000)}",
            "artifact_type": "purchase_opportunity",
            "title": "Custo de Oportunidade & Compra",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "payload": calc,
        }
    elif any(k in q for k in ["ganho real", "rentabilidade real", "inflação e imposto", "ipca", "taxa real"]):
        from src.intelligence.assistant_tools import calculate_real_return
        calc = calculate_real_return(12.0, 4.5, 15.0)
        return reply_text, {
            "id": f"ART-{int(time.time() * 1000)}",
            "artifact_type": "real_vs_nominal",
            "title": "Rentabilidade Real vs Nominal (Fisher)",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "payload": calc,
        }

    return reply_text, None


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    context_entity: Optional[str] = Field(default=None, description="Optional entity tag, e.g. inter_cnpj, nubank_pf")
    stream: bool = Field(default=True, description="Whether to stream via SSE")
    asd_mode: Optional[str] = Field(default=None, description="Optional ASD mode: 'none', 'asd_80', 'asd_strict'")


class SimulateRequest(BaseModel):
    artifact_type: str = Field(..., description="Tipo do artefato: compound_interest, purchase_opportunity, real_vs_nominal")
    params: dict[str, Any] = Field(default_factory=dict, description="Parâmetros de cálculo")


@router.post("/api/chat/simulate")
@router.post("/chat/simulate")
async def simulate_artifact_endpoint(request: SimulateRequest):
    """Direct deterministic calculation endpoint for Generative UI cards."""
    art_type = request.artifact_type
    p = request.params

    if art_type == "compound_interest":
        from src.intelligence.assistant_tools import calculate_compound_interest_series
        principal = float(p.get("initial_principal", 5000))
        monthly = float(p.get("monthly_deposit", 500))
        rate = float(p.get("annual_rate_percent", 11.25))
        years = int(p.get("years", 15))
        calc = calculate_compound_interest_series(principal, monthly, rate, years)
        return {
            "id": f"ART-SIM-{int(time.time() * 1000)}",
            "artifact_type": "compound_interest",
            "title": "Calculadora de Juros Compostos",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "payload": calc,
        }
    elif art_type == "purchase_opportunity":
        from src.intelligence.assistant_tools import calculate_opportunity_cost
        cost = float(p.get("cash_price", p.get("cost", 5000)))
        rate = float(p.get("benchmark_annual_rate", 11.25))
        item_name = p.get("item_name", "Decisão de Compra")
        income = float(p.get("family_monthly_income", 15000))
        calc = calculate_opportunity_cost(cost, rate, [2, 5, 10, 20], item_name, income)
        return {
            "id": f"ART-SIM-{int(time.time() * 1000)}",
            "artifact_type": "purchase_opportunity",
            "title": "Custo de Oportunidade & Compra",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "payload": calc,
        }
    elif art_type == "real_vs_nominal":
        from src.intelligence.assistant_tools import calculate_real_return
        nom = float(p.get("nominal_rate_percent", 12.0))
        inf = float(p.get("inflation_annual_percent", 4.5))
        tax = float(p.get("income_tax_percent", 15.0))
        calc = calculate_real_return(nom, inf, tax)
        return {
            "id": f"ART-SIM-{int(time.time() * 1000)}",
            "artifact_type": "real_vs_nominal",
            "title": "Rentabilidade Real vs Nominal (Fisher)",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "payload": calc,
        }
    else:
        raise HTTPException(status_code=400, detail=f"Tipo de artefato não suportado: {art_type}")


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
    card_type: Optional[str] = Field(default=None, description="Card type: EXPENSE_CONFIRMATION, REVENUE_CONFIRMATION or CORRECTION_CONFIRMATION")
    is_revenue: Optional[bool] = Field(default=None, description="Whether this transaction is revenue/income (+) rather than expense (-)")


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

    clean_reply, artifact = _extract_interactive_artifact(result["reply"], request.message)

    if request.stream:
        async def stream_generator() -> AsyncGenerator[str, None]:
            event_id = 1
            yield f"id: {event_id}\ndata: {json.dumps({'type': 'start', 'timestamp': datetime.now(timezone.utc).isoformat()}, ensure_ascii=False)}\n\n"
            words = clean_reply.split(" ")
            for i in range(0, len(words), 3):
                event_id += 1
                chunk = " ".join(words[i : i + 3]) + " "
                yield f"id: {event_id}\ndata: {json.dumps({'type': 'chunk', 'text': chunk}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.04)
            if artifact:
                event_id += 1
                yield f"id: {event_id}\ndata: {json.dumps({'type': 'artifact', 'artifact': artifact}, ensure_ascii=False)}\n\n"
            yield f"id: {event_id + 1}\ndata: {json.dumps({'type': 'done', 'provider': result.get('provider'), 'model': result.get('model'), 'latency_ms': result.get('latency_ms'), 'confirmation_card': result.get('confirmation_card'), 'artifact': artifact, 'asd_mode': result.get('asd_mode'), 'status': 'completed'}, ensure_ascii=False)}\n\n"

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
        "reply": clean_reply,
        "received": request.message,
        "entity": request.context_entity,
        "provider": result.get("provider"),
        "model": result.get("model"),
        "latency_ms": result.get("latency_ms"),
        "intent": result.get("intent"),
        "confirmation_card": result.get("confirmation_card"),
        "artifact": artifact,
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

    is_rev = request.is_revenue if request.is_revenue is not None else (request.card_type == "REVENUE_CONFIRMATION")

    signed_amount = Decimal(str(abs(request.amount))) if is_rev else Decimal(str(-abs(request.amount)))
    raw_desc = (
        f"Receita confirmada via Assistente: {request.counterparty}"
        if is_rev
        else f"Compra confirmada via Assistente: {request.counterparty}"
    )
    clean_desc = (
        f"Receita {request.counterparty} ({request.category})"
        if is_rev
        else f"Compra {request.counterparty} ({request.category})"
    )

    new_tx = Transaction(
        id=tx_id,
        entity_code=request.entity_code,
        account_name=request.account_name,
        date=tx_date,
        amount=signed_amount,
        currency="BRL",
        raw_description=raw_desc,
        clean_description=clean_desc,
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
            "amount": float(signed_amount),
            "is_transfer": False,
            "notes": new_tx.notes,
            "status": "CONFIRMED",
        },
        "receipt_correction": receipt_correction,
        "message": f"Lançamento de {'+R$' if is_rev else '-R$'} {abs(request.amount):,.2f} registrado com sucesso no Livro Razão.",
    }
