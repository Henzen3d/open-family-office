"""Spend Compliance & Segregation Engine inspired by Clara's pre-spend guardrails."""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
import re

from src.models.transactions import Transaction


PERSONAL_EXPENSE_KEYWORDS = [
    "supermercado", "mercado", "giassi", "angeloni", "bistek", "carrefour", "pao de acucar",
    "farmacia", "drogaria", "droga raia", "panvel", "sao joao", "catarinense",
    "cinema", "netflix", "spotify", "disney", "prime video", "steam", "playstation",
    "vestuario", "zara", "renner", "riachuelo", "c&a", "calcados",
    "pet shop", "veterinaria", "petz", "cobasi",
    "restaurante", "bar", "churrascaria", "ifood", "uber eats", "aiqfome",
    "escola", "colegio", "mensalidade escolar", "brinquedos"
]

MEI_OPERATIONAL_KEYWORDS = [
    "hospedagem", "servidor", "aws", "google cloud", "azure", "github", "cloudflare",
    "certisign", "serasa", "certificado digital", "software", "licenca",
    "ferramentas", "material eletrico", "insumos tecnicos", "equipamento",
    "cartorio", "autenticacao", "taxa prefeitura", "crea", "conselho regional",
    "vistoria", "laudo tecnico", "trena", "decibelimetro", "equipamento vistoria"
]

EXEMPT_EXPENSE_PATTERNS = [
    "das ", "das-mei", "pgmei", "darf", "simples nacional", "receita federal",
    "tarifa", "tar banc", "manutencao conta", "iof", "anuidade", "juros",
    "pagamento fatura", "pagto fatura", "fatura cartao", "fatura nubank", "fatura inter",
    "resgate", "aplicacao", "rendimento"
]


@dataclass
class ComplianceEvaluation:
    transaction_id: str
    receipt_status: str  # "MATCHED", "PENDING", "EXEMPT"
    segregation_risk: str  # "NORMAL", "SUSPECTED_PERSONAL_ON_MEI", "SUSPECTED_MEI_ON_PERSONAL"
    risk_severity: str  # "LOW", "MEDIUM", "HIGH"
    compliance_notes: str
    suggested_action: Optional[str] = None


class SpendComplianceEngine:
    """Evaluates business vs personal spend segregation and receipt documentation compliance."""

    def __init__(self):
        pass

    def is_exempt_from_receipt(self, tx: Transaction) -> bool:
        """Determines if a transaction does not require a commercial tax receipt (e.g. taxes, fees, transfers)."""
        if tx.is_transfer:
            return True
        if tx.amount >= Decimal("0.00"):
            return True  # Inflows don't have purchase receipts

        desc = (tx.raw_description + " " + tx.clean_description + " " + tx.notes).lower()
        if any(pat in desc for pat in EXEMPT_EXPENSE_PATTERNS):
            return True

        # Checking account internal adjustments or card bill settlements
        if "settlement" in desc or "neutralized" in desc or "fatura" in desc:
            return True

        return False

    def evaluate_transaction(self, tx: Transaction, has_receipt: bool) -> ComplianceEvaluation:
        """Evaluates a single transaction against spend policies and documentation compliance."""
        # 1. Receipt Status
        if has_receipt:
            receipt_status = "MATCHED"
        elif self.is_exempt_from_receipt(tx):
            receipt_status = "EXEMPT"
        else:
            receipt_status = "PENDING"

        # 2. Segregation Evaluation (Confusão Patrimonial)
        desc = (tx.raw_description + " " + tx.clean_description + " " + tx.counterparty + " " + tx.category_code).lower()
        entity = (tx.entity_code or "").upper().strip()
        is_mei = entity in ("FIX_SERVICOS", "FACILITA_VISTORIAS")
        is_personal = entity in ("HOUSEHOLD_OSMAR", "OSMAR", "VERA")

        segregation_risk = "NORMAL"
        risk_severity = "LOW"
        compliance_notes = "Conforme às políticas de conformidade da entidade."
        suggested_action = None

        if tx.amount < Decimal("0.00") and not tx.is_transfer:
            # Check for personal expenses in MEI account
            if is_mei:
                matched_personal_words = [w for w in PERSONAL_EXPENSE_KEYWORDS if re.search(rf"\b{re.escape(w)}\b", desc)]
                if matched_personal_words:
                    segregation_risk = "SUSPECTED_PERSONAL_ON_MEI"
                    risk_severity = "HIGH"
                    compliance_notes = (
                        f"Possível despesa de consumo pessoal ('{matched_personal_words[0]}') debitada em conta MEI ({entity}). "
                        "Risco de confusão patrimonial perante a Receita Federal."
                    )
                    suggested_action = "Reclassificar como Antecipação de Lucros ou estornar via reembolso para a conta PJ."

            # Check for MEI operational expenses paid with personal account
            elif is_personal:
                matched_mei_words = [w for w in MEI_OPERATIONAL_KEYWORDS if re.search(rf"\b{re.escape(w)}\b", desc)]
                if matched_mei_words:
                    segregation_risk = "SUSPECTED_MEI_ON_PERSONAL"
                    risk_severity = "MEDIUM"
                    compliance_notes = (
                        f"Despesa com perfil operacional ('{matched_mei_words[0]}') paga em conta familiar. "
                        "Pode ser deduzida no livro caixa do MEI mediante ressarcimento formal."
                    )
                    suggested_action = "Registrar reembolso do MEI correspondente para a conta física da família."

        if receipt_status == "PENDING" and segregation_risk == "NORMAL":
            if abs(tx.amount) >= Decimal("200.00"):
                risk_severity = "MEDIUM"
                compliance_notes = "Despesa comercial sem cupom/nota fiscal vinculado. Recomendado anexar comprovante para respaldo fiscal."
            else:
                risk_severity = "LOW"
                compliance_notes = "Comprovante pendente."

        return ComplianceEvaluation(
            transaction_id=tx.id,
            receipt_status=receipt_status,
            segregation_risk=segregation_risk,
            risk_severity=risk_severity,
            compliance_notes=compliance_notes,
            suggested_action=suggested_action,
        )

    def audit_batch(
        self,
        transactions: List[Transaction],
        receipt_tx_ids: set[str],
    ) -> Dict[str, any]:
        """Audits an entire set of transactions, producing Clara-style compliance metrics."""
        evaluations: List[ComplianceEvaluation] = []
        pending_receipts_count = 0
        pending_receipts_amount = Decimal("0.00")
        matched_receipts_count = 0
        matched_receipts_amount = Decimal("0.00")
        exempt_receipts_count = 0

        personal_on_mei_alerts: List[ComplianceEvaluation] = []
        mei_on_personal_alerts: List[ComplianceEvaluation] = []

        # Duplicate detection (within 1 day window, same amount and description)
        duplicate_candidates: List[Tuple[str, str]] = []
        seen: Dict[Tuple[str, str, Decimal], str] = {}

        for tx in transactions:
            has_rcp = tx.id in receipt_tx_ids
            ev = self.evaluate_transaction(tx, has_receipt=has_rcp)
            evaluations.append(ev)

            if ev.receipt_status == "PENDING":
                pending_receipts_count += 1
                pending_receipts_amount += abs(tx.amount)
            elif ev.receipt_status == "MATCHED":
                matched_receipts_count += 1
                matched_receipts_amount += abs(tx.amount)
            else:
                exempt_receipts_count += 1

            if ev.segregation_risk == "SUSPECTED_PERSONAL_ON_MEI":
                personal_on_mei_alerts.append(ev)
            elif ev.segregation_risk == "SUSPECTED_MEI_ON_PERSONAL":
                mei_on_personal_alerts.append(ev)

            # Check potential duplicate
            if tx.amount < Decimal("0.00") and not tx.is_transfer:
                clean_desc = (tx.clean_description or tx.raw_description).strip().lower()
                key = (tx.entity_code, clean_desc, tx.amount)
                if key in seen:
                    duplicate_candidates.append((seen[key], tx.id))
                else:
                    seen[key] = tx.id

        total_expenses = pending_receipts_count + matched_receipts_count
        documentation_rate = (
            float((matched_receipts_count / total_expenses) * 100)
            if total_expenses > 0
            else 100.0
        )

        return {
            "total_transactions": len(transactions),
            "documentation_rate": round(documentation_rate, 1),
            "pending_receipts": {
                "count": pending_receipts_count,
                "total_amount": float(pending_receipts_amount),
            },
            "matched_receipts": {
                "count": matched_receipts_count,
                "total_amount": float(matched_receipts_amount),
            },
            "exempt_receipts_count": exempt_receipts_count,
            "segregation_alerts": {
                "personal_on_mei_count": len(personal_on_mei_alerts),
                "personal_on_mei": [
                    {
                        "transaction_id": a.transaction_id,
                        "notes": a.compliance_notes,
                        "suggested_action": a.suggested_action,
                    }
                    for a in personal_on_mei_alerts
                ],
                "mei_on_personal_count": len(mei_on_personal_alerts),
                "mei_on_personal": [
                    {
                        "transaction_id": a.transaction_id,
                        "notes": a.compliance_notes,
                        "suggested_action": a.suggested_action,
                    }
                    for a in mei_on_personal_alerts
                ],
            },
            "potential_duplicates_count": len(duplicate_candidates),
            "potential_duplicates": duplicate_candidates,
            "evaluations_by_id": {ev.transaction_id: ev for ev in evaluations},
        }

