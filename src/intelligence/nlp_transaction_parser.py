"""Universal NLP Financial Parser for OpenFamilyOffice (Phase 7).

Parses natural Portuguese colloquial chat inputs into deterministic financial actions:
1. Natural Language Revenues & Expenses (e.g. "Ganhei R$100 na fix instalando uma lâmpada")
2. Bank Balance Lists (e.g. "Nubank: R$ 12.500 / Inter: R$ 8.300")
3. US Stock Portfolio Lists (e.g. "Tenho na Avenue: 15 AAPL a $180, 10 NVDA")
4. Expense Estimation / Gap Reconciliation Requests
"""
from __future__ import annotations

import re
import time
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from src.models.portfolio import BENCHMARK_US_PRICES


def _clean_number_to_float(raw: str) -> Optional[float]:
    """Converts a formatted Brazilian or international numeric string to float."""
    raw = raw.strip()
    if not raw:
        return None

    # Handle both separators: e.g. 1.250.000,50 or 1,250,000.50
    if "." in raw and "," in raw:
        last_dot = raw.rfind(".")
        last_comma = raw.rfind(",")
        if last_comma > last_dot:
            # Brazilian format: 1.500,00 or 1.250.000,50
            cleaned = raw.replace(".", "").replace(",", ".")
        else:
            # US format: 1,500.00
            cleaned = raw.replace(",", "")
        try:
            return float(cleaned)
        except ValueError:
            return None

    # If only comma is present: e.g. 100,00 or 45,50
    if "," in raw:
        cleaned = raw.replace(",", ".")
        try:
            return float(cleaned)
        except ValueError:
            return None

    # If only dot is present:
    if "." in raw:
        parts = raw.split(".")
        # Multiple dots: e.g. 1.250.000 -> 1250000.0
        if len(parts) > 2:
            cleaned = raw.replace(".", "")
            try:
                return float(cleaned)
            except ValueError:
                return None
        # Single dot: e.g. 1.500 or 45.50 or 12.500
        # In Brazilian Portuguese, 3 digits after the dot represents a thousands separator
        if len(parts[1]) == 3:
            cleaned = raw.replace(".", "")
            try:
                return float(cleaned)
            except ValueError:
                return None
        else:
            try:
                return float(raw)
            except ValueError:
                return None

    # Plain integer
    try:
        return float(raw)
    except ValueError:
        return None


def parse_monetary_amount(text: str) -> Optional[float]:
    """Extracts a monetary amount in BRL or raw decimal format."""
    # Pattern 1: R$ prefix with amounts like R$ 1.250.000,00 or R$ 1.500 or R$ 100,50 or R$100
    m1 = re.search(r"r\$\s*([0-9]+(?:[\.,][0-9]+)*)", text, re.IGNORECASE)
    if m1:
        val = _clean_number_to_float(m1.group(1))
        if val is not None:
            return val

    # Pattern 2: Suffix with colloquial currency: 1500 reais, 50 conto, 30 pila, 1.500 reais
    m2 = re.search(r"\b([0-9]+(?:[\.,][0-9]+)*)\s*(?:reais|conto|pila|barrões|barroes)\b", text, re.IGNORECASE)
    if m2:
        val = _clean_number_to_float(m2.group(1))
        if val is not None:
            return val

    # Pattern 3: Number with thousands separators (e.g. 1.250.000 or 1.500,00 or 12.500)
    m3 = re.search(r"\b(\d{1,3}(?:\.\d{3})+(?:,\d{2})?)\b", text)
    if m3:
        val = _clean_number_to_float(m3.group(1))
        if val is not None:
            return val

    # Pattern 4: Number with decimal point or comma: e.g. 100,00 or 45.50
    m4 = re.search(r"\b(\d+,\d{2}|\d+\.\d{2})\b", text)
    if m4:
        val = _clean_number_to_float(m4.group(1))
        if val is not None:
            return val

    return None


def parse_natural_transaction(text: str, default_entity: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Parses a freeform conversational sentence into a structured transaction proposal.

    Examples:
    - 'Ganhei R$100,00 em um atendimento na fix serviços instalando uma lampada'
    - 'Faturei 250 reais na vistoria do condomínio central pela facilita'
    - 'Gastei 45 no posto com gasolina na conta do Inter'
    - 'Comprei 180 no mercado giassi'
    """
    clean_text = text.strip()
    clean_lower = clean_text.lower()

    # Must contain a monetary amount
    amount = parse_monetary_amount(clean_text)
    if not amount or amount <= 0:
        return None

    # Detect Revenue vs Expense
    revenue_cues = [
        "ganhei", "faturei", "recebi", "entrou", "recebimento",
        "atendimento", "serviço feito", "servico feito", "pix recebido",
        "prestação de serviço", "prestacao de servico", "vendi", "lucro",
    ]
    expense_cues = [
        "gastei", "comprei", "paguei", "pago", "compra", "despesa",
        "almoço", "almoco", "jantar", "mercado", "supermercado", "abasteci",
    ]

    is_revenue = any(c in clean_lower for c in revenue_cues)
    is_expense = any(c in clean_lower for c in expense_cues)

    # If neither explicit, infer from context keywords
    if not is_revenue and not is_expense:
        if any(k in clean_lower for k in ["fix serviços", "fix servicos", "facilita vistoria", "instalando", "conserto", "reparo", "vistoria"]):
            is_revenue = True
        else:
            return None

    # Determine Entity, Bank Account and Category
    # Check for explicit household indicators (supermarket, personal care, home cues)
    is_explicit_household = any(k in clean_lower for k in [
        "para casa", "em casa", "casa", "pessoal", "doméstico", "domestico", "família", "familia",
        "mercado", "supermercado", "giassi", "bistek", "angeloni", "açougue", "acougue",
        "farmácia", "farmacia", "posto", "gasolina", "almoço", "almoco", "jantar"
    ])

    if any(k in clean_lower for k in ["facilita", "facilita vistorias", "facilita vistoria"]) or (is_revenue and any(k in clean_lower for k in ["vistoria", "vistorias", "laudo"])):
        entity_code = "FACILITA_VISTORIAS"
        entity_name = "Facilita Vistorias MEI (Vera)"
        account_name = "Caixa PJ"
        category = "Vistorias Imobiliárias" if is_revenue else "Despesas Operacionais"
        default_cpty = "Cliente Imobiliária / Proprietário" if is_revenue else "Fornecedor Facilita"
    elif not is_explicit_household and (
        any(k in clean_lower for k in ["fix", "fix serviços", "fix servicos", "inter pj"])
        or (is_revenue and any(k in clean_lower for k in ["instalando", "instalação", "instalacao", "reparo", "conserto", "elétrica", "eletrica", "chuveiro", "lâmpada", "lampada"]))
    ):
        entity_code = "FIX_SERVICOS"
        entity_name = "Fix Serviços MEI (Osmar)"
        account_name = "Banco Inter PJ"
        category = "Serviços Prestados" if is_revenue else "Materiais Operacionais"
        default_cpty = "Cliente Fix Serviços" if is_revenue else "Fornecedor Fix"
    else:
        entity_code = "HOUSEHOLD_OSMAR"
        entity_name = "Família (Osmar & Vera)"
        account_name = "Nubank PF"
        if any(k in clean_lower for k in ["mercado", "giassi", "bistek", "angeloni", "compras", "açougue", "acougue"]):
            category = "Supermercado"
            default_cpty = "Supermercado Giassi"
        elif any(k in clean_lower for k in ["gasolina", "combustível", "combustivel", "posto", "ipiranga", "shell"]):
            category = "Combustível"
            default_cpty = "Posto de Combustível"
        elif any(k in clean_lower for k in ["luz", "energia", "água", "agua", "internet", "aluguel"]):
            category = "Moradia"
            default_cpty = "Concessionária de Serviços"
        elif any(k in clean_lower for k in ["farmácia", "farmacia", "remédio", "remedio"]):
            category = "Saúde"
            default_cpty = "Farmácia"
        elif any(k in clean_lower for k in ["lâmpada", "lampada", "chuveiro", "reparo", "conserto"]):
            category = "Manutenção da Casa"
            default_cpty = "Loja de Materiais de Construção"
        else:
            category = "Outros"
            default_cpty = "Diversos"
            default_cpty = "Diversos"

    # Refine description
    clean_desc = ""
    if "instalando" in clean_lower:
        m_inst = re.search(r"instalando\s+([^,\.]+)", clean_text, re.IGNORECASE)
        clean_desc = f"Instalação de {m_inst.group(1).strip()}" if m_inst else "Serviço de Instalação"
    elif "vistoria" in clean_lower:
        m_vist = re.search(r"vistoria\s+([^,\.]+)", clean_text, re.IGNORECASE)
        clean_desc = f"Vistoria: {m_vist.group(1).strip()}" if m_vist else "Vistoria Imobiliária"
    elif "mercado" in clean_lower or "giassi" in clean_lower:
        clean_desc = "Compras de Supermercado"
    else:
        clean_desc = f"{'Receita' if is_revenue else 'Despesa'}: {category}"

    card_type = "REVENUE_CONFIRMATION" if is_revenue else "EXPENSE_CONFIRMATION"
    formatted_amount = f"R$ {amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    signed_amount = amount if is_revenue else -amount

    return {
        "card_id": f"CARD-NLP-{int(time.time() * 1000)}",
        "type": card_type,
        "is_revenue": is_revenue,
        "amount": amount,
        "raw_amount": amount,
        "formatted_amount": formatted_amount,
        "date": date.today().isoformat(),
        "counterparty": default_cpty,
        "category": category,
        "entity_code": entity_code,
        "entity_name": entity_name,
        "account_name": account_name,
        "status": "AWAITING_CONFIRMATION",
        "clean_description": clean_desc,
        "raw_text": clean_text,
    }


def parse_balance_list(text: str) -> Optional[List[Dict[str, Any]]]:
    """Parses a multi-account balance update list.

    Example input:
    Nubank: R$ 12.500,00
    Inter: R$ 8.300,00
    Caixa: R$ 4.100,00
    """
    clean_text = text.strip()
    clean_lower = clean_text.lower()

    # Exclude messages that describe an expense or purchase transaction
    expense_words = [
        "compra", "despesa", "gastei", "comprei", "paga pelo", "pago no",
        "pago com", "paguei", "cartão", "cartao", "registra", "lançamento", "cupom"
    ]
    if any(w in clean_lower for w in expense_words):
        return None

    # Look for cues of balance update list
    balance_cues = ["saldo", "saldos", "atualizar", "sincronizar", "extrato", "posicao de caixa", "posição de caixa"]
    has_balance_cue = any(c in clean_lower for c in balance_cues)

    # Check if text contains line breaks or semicolons
    lines = [l.strip() for l in re.split(r"[\n;\r]+", clean_text) if l.strip()]
    if not lines:
        return None

    matched_accounts: List[Dict[str, Any]] = []

    # Bank alias map
    account_aliases = [
        {"id": "nubank_pf", "name": "Nubank PF", "keywords": ["nubank", "nu", "roxinho", "ultravioleta"]},
        {"id": "inter_pj", "name": "Banco Inter PJ", "keywords": ["inter", "banco inter", "pj inter", "inter pj"]},
        {"id": "caixa_pj", "name": "Caixa PJ", "keywords": ["caixa", "cef", "caixa economica", "caixa pj"]},
    ]

    for line in lines:
        line_amt = parse_monetary_amount(line)
        if line_amt is None:
            continue

        l_low = line.lower()
        matched_target = None
        for acc in account_aliases:
            if any(k in l_low for k in acc["keywords"]):
                matched_target = acc
                break

        if matched_target:
            matched_accounts.append({
                "account_id": matched_target["id"],
                "account_name": matched_target["name"],
                "new_balance": round(line_amt, 2),
                "formatted_new_balance": f"R$ {line_amt:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            })

    if not matched_accounts:
        return None

    # If only one account matched, require an explicit balance keyword to avoid false positives
    if len(matched_accounts) == 1 and not has_balance_cue:
        return None

    return matched_accounts


def parse_us_stocks_list(text: str) -> Optional[Dict[str, Any]]:
    """Parses a list of US stock positions and broker.

    Examples:
    - 'Tenho na Avenue: 15 AAPL a $180, 10 NVDA a $120, 8 MSFT a $400'
    - 'Ações na Avenue:
       AAPL: 15 ações
       NVDA: 10 ações
       TSLA: 5 ações'
    """
    clean_text = text.strip()
    clean_lower = clean_text.lower()

    stock_cues = ["ações", "acoes", "stocks", "avenue", "nomad", "schwab", "ticker", "aapl", "nvda", "tsla", "msft", "vt", "voo"]
    if not any(c in clean_lower for c in stock_cues):
        return None

    # Detect broker
    broker = "Avenue"
    if "nomad" in clean_lower:
        broker = "Nomad"
    elif "schwab" in clean_lower or "charles" in clean_lower:
        broker = "Charles Schwab"
    elif "interactive" in clean_lower or "ibkr" in clean_lower:
        broker = "Interactive Brokers"

    # Regex for ticker and quantity: e.g. "15 AAPL" or "AAPL: 15" or "AAPL 15 ações a $180"
    items: List[Dict[str, Any]] = []

    # Pattern A: TICKER [: ou - ou espaço] NUM [ações] [@ ou a $NUM]
    pattern_a = re.finditer(
        r"\b([A-Za-z]{1,5})\s*[:\-\=]?\s*(\d+[\.,]?\d*)\s*(?:ações|acoes|shares|cotas)?(?:\s*(?:a|@|\$)\s*\$?(\d+[\.,]?\d*))?",
        clean_text,
        re.IGNORECASE,
    )

    # Pattern B: NUM [ações de] TICKER [@ ou a $NUM]
    pattern_b = re.finditer(
        r"\b(\d+[\.,]?\d*)\s*(?:ações\s+de|acoes\s+de|shares\s+of)?\s+([A-Za-z]{1,5})(?:\s*(?:a|@|\$)\s*\$?(\d+[\.,]?\d*))?",
        clean_text,
        re.IGNORECASE,
    )

    seen_tickers = set()

    for m in pattern_a:
        sym = m.group(1).upper()
        # Filter false positives like "R", "RS", "NA", "NO", "A", "DE", "EM"
        if sym in ["R", "RS", "NA", "NO", "DE", "EM", "DA", "DO", "TENHO", "AÇÕES", "ACOES", "BANCO"]:
            continue
        # Check if known ticker or 2-5 letters
        if (sym in BENCHMARK_US_PRICES or len(sym) >= 2) and sym not in seen_tickers:
            try:
                shares = float(m.group(2).replace(",", "."))
                cost = float(m.group(3).replace(",", ".")) if m.group(3) else BENCHMARK_US_PRICES.get(sym, 100.0)
                if shares > 0:
                    seen_tickers.add(sym)
                    items.append({
                        "ticker": sym,
                        "shares": shares,
                        "avg_cost_usd": cost,
                        "broker": broker,
                    })
            except (ValueError, TypeError):
                continue

    if not items:
        for m in pattern_b:
            sym = m.group(2).upper()
            if sym in ["R", "RS", "NA", "NO", "DE", "EM", "DA", "DO", "TENHO", "AÇÕES", "ACOES"]:
                continue
            if (sym in BENCHMARK_US_PRICES or len(sym) >= 2) and sym not in seen_tickers:
                try:
                    shares = float(m.group(1).replace(",", "."))
                    if shares > 0:
                        seen_tickers.add(sym)
                        cost = float(m.group(3).replace(",", ".")) if m.group(3) else BENCHMARK_US_PRICES.get(sym, 100.0)
                        items.append({
                            "ticker": sym,
                            "shares": shares,
                            "avg_cost_usd": cost,
                            "broker": broker,
                        })
                except (ValueError, TypeError):
                    continue

    if items:
        return {
            "broker": broker,
            "items": items,
            "count": len(items),
        }
    return None


def parse_estimation_request(text: str) -> bool:
    """Detects whether user is asking to generate estimates for missing months."""
    clean_lower = text.lower().strip()
    cues = [
        "lançar estimativa", "lancar estimativa", "estimativa de gastos",
        "preencher meses", "meses vazios", "meses que faltam",
        "média dos meses", "media dos meses", "estimar mercado",
        "estimar gastos", "fechar as contas", "fechar contas",
        "contabilidade não fecha", "contabilidade nao fecha",
    ]
    return any(c in clean_lower for c in cues)
