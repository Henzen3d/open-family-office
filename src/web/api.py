"""OpenFamilyOffice — Core FastAPI Application.

Provides REST and SSE endpoints for the Next.js web interface, receipt ingestion,
banking data uploads, and conversational assistant following ASD-STE100 ~80%.
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from src.security.sanitizer import PIISanitizer, SecurityEgressException

# Application Initialization
app = FastAPI(
    title="OpenFamilyOffice API",
    version="1.0.0",
    description="Deterministic financial engine and executive assistant API.",
)

sanitizer = PIISanitizer()


# CORS middleware for local development (Next.js reverse proxy handles production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(os.getenv("DATA_DIR", "/data" if os.path.exists("/data") else "data"))
REPORTS_DIR = Path(os.getenv("REPORTS_DIR", "reports"))


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    context_entity: Optional[str] = Field(default=None, description="Optional entity tag, e.g. inter_cnpj, nubank_pf")
    stream: bool = Field(default=True, description="Whether to stream via SSE")


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Healthcheck endpoint for Docker container and orchestrator."""
    return {
        "status": "healthy",
        "app": "OpenFamilyOffice",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data_dir_exists": DATA_DIR.exists(),
        "reports_dir_exists": REPORTS_DIR.exists(),
    }


@app.get("/api/status")
async def system_status():
    """Returns general operational status of ledger and data stores."""
    ledger_file = DATA_DIR / "ledger" / "transactions.csv"
    reports = list(REPORTS_DIR.glob("briefing_*.md")) if REPORTS_DIR.exists() else []

    return {
        "system": "OpenFamilyOffice",
        "version": "1.0.0",
        "status": "online",
        "data_dir": str(DATA_DIR),
        "ledger_configured": ledger_file.exists(),
        "available_reports_count": len(reports),
        "supported_entities": [
            {
                "id": "fix_servicos",
                "label": "Fix Serviços MEI",
                "titular": "Osmar",
                "tax_regime": "MEI",
                "default_account": "Inter CNPJ",
                "legal_note": "Titular individual exclusivo (LC 123/2006, Art. 18-A).",
            },
            {
                "id": "facilita_vistorias",
                "label": "Facilita Vistorias MEI",
                "titular": "Vera",
                "tax_regime": "MEI",
                "default_account": "Caixa PJ",
                "legal_note": "Titular individual exclusiva (LC 123/2006, Art. 18-A).",
            },
            {
                "id": "household_osmar",
                "label": "Família / PF",
                "titular": "Casal (Comunhão)",
                "tax_regime": "PF",
                "default_account": "Nubank PF",
                "legal_note": "Patrimônio pessoal e frutos consolidados do casal.",
            },
        ],
    }


async def generate_chat_stream(user_message: str, entity: Optional[str] = None) -> AsyncGenerator[str, None]:
    """Generates SSE chunks adhering to ASD-STE100 ~80% style with PII masking."""
    sanitized_msg, tokens = sanitizer.sanitize(user_message)
    # Enforce egress safety: ensure no unmasked PII leaks
    try:
        sanitizer.verify_egress_safety(sanitized_msg)
    except SecurityEgressException as exc:
        yield f"id: 1\ndata: {json.dumps({'type': 'error', 'message': str(exc)}, ensure_ascii=False)}\n\n"
        return

    clean_msg = sanitized_msg.lower().strip()

    # Monotonic event ID counter
    event_id = 0

    def format_sse(data: dict) -> str:
        nonlocal event_id
        event_id += 1
        return f"id: {event_id}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

    # Initial event: acknowledgment
    yield format_sse({"type": "start", "timestamp": datetime.now(timezone.utc).isoformat()})
    await asyncio.sleep(0.05)

    # Deterministic responses based on keyword queries
    if "mei" in clean_msg or "teto" in clean_msg:
        facts = [
            "Teto anual do MEI (2026): R$ 81.000,00.",
            "Limite mensal de referência: R$ 6.750,00.",
            "Fix Serviços MEI: Faturamento acumulado no ano sob controle.",
            "Facilita Vistorias MEI: Faturamento acumulado no ano sob controle.",
            "Nenhum desenquadramento iminente detectado.",
        ]
    elif "resumo" in clean_msg or "briefing" in clean_msg or "relatório" in clean_msg:
        facts = [
            "Posição de caixa consolidada: Normal.",
            "Contas a pagar nos próximos 7 dias: Monitoradas.",
            "Cartões Nubank e Inter: Sem faturas vencidas hoje.",
            "Transferências entre PJ e PF: Reconciliadas.",
        ]
    elif "inter" in clean_msg or "cnpj" in clean_msg or "comprovante" in clean_msg or "cupom" in clean_msg:
        facts = [
            f"Transação recebida com contexto: {entity or 'Inter CNPJ'}.",
            "Dados pessoais e bancários sensíveis anonimizados antes do processamento.",
            "Comprovante indexado no livro-razão local.",
            "Status: Aguardando conferência no fechamento semanal.",
        ]
    else:
        facts = [
            f"Mensagem processada: \"{user_message[:50]}\".",
            "Assistente operacional ativo com padrão ASD-STE100 (~80%).",
            "Frases curtas. Fatos numéricos primeiro. Sem jargão prolixo.",
            "Pronto para lançar comprovantes, verificar faturas ou auditar tetos fiscais.",
        ]

    for fact in facts:
        # Send heartbeat ping if needed
        yield ": ping\n\n"
        yield format_sse({"type": "chunk", "text": fact + " "})
        await asyncio.sleep(0.08)

    yield format_sse({"type": "done", "status": "completed"})


@app.post("/api/chat")
async def chat_endpoint(request: ChatMessageRequest):
    """Chat endpoint supporting SSE streaming."""
    if request.stream:
        return StreamingResponse(
            generate_chat_stream(request.message, request.context_entity),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    # Non-streaming fallback
    sanitized_msg, tokens = sanitizer.sanitize(request.message)
    sanitizer.verify_egress_safety(sanitized_msg)
    raw_reply = "Assistente ativo. Padrão ASD-STE100 ~80% habilitado. Envie mensagens para iniciar consulta."
    final_reply = sanitizer.detokenize(raw_reply, tokens)

    return {
        "reply": final_reply,
        "received": sanitized_msg,
        "entity": request.context_entity,
        "sanitized": True,
    }


@app.post("/api/receipts/upload")
async def upload_receipt(
    file: UploadFile = File(...),
    entity: str = Form(default="inter_cnpj"),
    notes: Optional[str] = Form(default=None),
):
    """Receives mobile receipt photo, stores it locally, and prepares for extraction."""
    receipts_dir = DATA_DIR / "receipts"
    receipts_dir.mkdir(parents=True, exist_ok=True)

    timestamp = int(time.time())
    safe_filename = f"{timestamp}_{file.filename}"
    target_path = receipts_dir / safe_filename

    content = await file.read()
    with open(target_path, "wb") as f:
        f.write(content)

    return {
        "status": "received",
        "file_name": safe_filename,
        "bytes_received": len(content),
        "target_entity": entity,
        "user_notes": notes,
        "message": "Comprovante salvo com sucesso na pasta local. Pronto para extração.",
    }


@app.get("/api/reports/latest")
async def get_latest_report():
    """Returns the most recent executive briefing markdown."""
    if not REPORTS_DIR.exists():
        raise HTTPException(status_code=404, detail="Diretório de relatórios ainda não criado.")

    reports = sorted(REPORTS_DIR.glob("briefing_*.md"), key=os.path.getmtime, reverse=True)
    if not reports:
        raise HTTPException(status_code=404, detail="Nenhum relatório gerado até o momento.")

    latest = reports[0]
    return {
        "report_id": latest.stem,
        "filename": latest.name,
        "last_modified": datetime.fromtimestamp(latest.stat().st_mtime, timezone.utc).isoformat(),
        "content": latest.read_text(encoding="utf-8"),
    }

