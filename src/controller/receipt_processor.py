"""Receipt Ingestion and OCR Processor Engine.
Supports Brazilian SEFAZ NFC-e QR-Code / Access Key extraction and Multimodal Vision AI parsing.
"""
from datetime import date, datetime, time
from decimal import Decimal, ROUND_HALF_UP
import json
import os
import re
from typing import Dict, List, Optional, Tuple
import urllib.parse
import uuid

from src.models.receipts import Receipt, ReceiptItem
from src.models.transactions import Transaction
from src.controller.receipt_matcher import ReceiptMatcher
from src.llm.client import UniversalLLMClient
from src.llm.config_manager import CustomProviderConfig


# Brazilian IBGE UF Code Mapping for SEFAZ 44-digit Chave de Acesso
UF_IBGE_MAP = {
    "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
    "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL",
    "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR",
    "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF"
}


class ReceiptProcessor:
    """Processes receipts via Brazilian SEFAZ NFC-e QR codes or Multimodal Vision AI models."""

    def __init__(self, matcher: Optional[ReceiptMatcher] = None):
        self.matcher = matcher or ReceiptMatcher()

    def parse_sefaz_access_key(self, raw_input: str) -> Optional[Dict[str, str]]:
        """Extracts and parses the 44-digit Brazilian SEFAZ Chave de Acesso from a QR URL or text."""
        # 1. Check if 44 consecutive digits exist
        match = re.search(r"\b(\d{44})\b", raw_input)
        if match:
            chave = match.group(1)
        else:
            # 2. Check for URL parameters like p=... or chNFe=...
            parsed = urllib.parse.urlparse(raw_input)
            query_params = urllib.parse.parse_qs(parsed.query)
            
            p_val = query_params.get("p", [""])[0]
            chnfe_val = query_params.get("chNFe", [""])[0]
            
            target_str = p_val or chnfe_val or raw_input
            match_param = re.search(r"(\d{44})", target_str)
            if not match_param:
                return None
            chave = match_param.group(1)

        uf_code = chave[0:2]
        uf_sigla = UF_IBGE_MAP.get(uf_code, "BR")
        ano = f"20{chave[2:4]}"
        mes = chave[4:6]
        cnpj_emitente = chave[6:20]
        modelo = chave[20:22]  # 65 = NFC-e, 55 = NF-e
        serie = chave[22:25]
        numero_doc = chave[25:34]

        # Extract total amount if encoded in standard NFC-e QR format
        # Standard SEFAZ NFC-e QR format: chNFe|2|tpAmb|cDest|dhEmi|vNF|...
        total_amount = None
        if "|" in raw_input:
            parts = raw_input.split("|")
            for part in parts[1:]:
                # Total amount usually contains fractional separator (. or ,)
                if "." in part or "," in part:
                    cleaned_num = part.replace(",", ".")
                    try:
                        val = Decimal(cleaned_num)
                        if Decimal("0.01") <= val <= Decimal("500000.00"):
                            total_amount = val
                            break
                    except Exception:
                        continue

        return {
            "chave_acesso": chave,
            "uf": uf_sigla,
            "ano": ano,
            "mes": mes,
            "cnpj_emitente": cnpj_emitente,
            "modelo": "NFC-e" if modelo == "65" else "NF-e",
            "serie": serie,
            "numero_doc": numero_doc,
            "total_amount": total_amount,
        }

    def create_receipt_from_sefaz_key(
        self,
        key_info: Dict[str, str],
        merchant_name: str = "Estabelecimento Comercial",
        entity_code: str = "HOUSEHOLD_OSMAR",
        total_amount: Optional[Decimal] = None,
    ) -> Receipt:
        """Instantiates a Receipt model from decoded SEFAZ access key data."""
        receipt_id = f"rcp-nfce-{uuid.uuid4().hex[:8]}"
        issue_year = int(key_info.get("ano", datetime.now().year))
        issue_month = int(key_info.get("mes", datetime.now().month))
        # Default to first day of emission month if exact day not present
        issue_date = date(issue_year, issue_month, 1)

        amount = total_amount or key_info.get("total_amount") or Decimal("0.00")

        # Format CNPJ: XX.XXX.XXX/XXXX-XX
        raw_cnpj = key_info.get("cnpj_emitente", "")
        formatted_cnpj = (
            f"{raw_cnpj[0:2]}.{raw_cnpj[2:5]}.{raw_cnpj[5:8]}/{raw_cnpj[8:12]}-{raw_cnpj[12:14]}"
            if len(raw_cnpj) == 14
            else raw_cnpj
        )

        return Receipt(
            id=receipt_id,
            entity_code=entity_code,
            image_storage_path=f"sefaz://{key_info['chave_acesso']}",
            merchant_name=merchant_name,
            issue_date=issue_date,
            total_amount=amount,
            merchant_tax_id=formatted_cnpj,
            fiscal_access_key=key_info["chave_acesso"],
            payment_method="UNKNOWN",
            confidence_score=Decimal("1.00"),
            source_channel="QR_CODE",
            parser_engine="QR_CODE_NFCE",
            items=[],
        )

    def parse_vision_json(self, raw_json_str: str, image_path: str = "") -> Receipt:
        """Parses the JSON response produced by the Multimodal Vision AI parser (prompts/08_receipt_ocr_parser.md)."""
        # Strip potential markdown formatting (```json ... ```)
        cleaned_str = raw_json_str.strip()
        if cleaned_str.startswith("```"):
            cleaned_str = re.sub(r"^```(?:json)?\s*", "", cleaned_str)
            cleaned_str = re.sub(r"\s*```$", "", cleaned_str)

        data = json.loads(cleaned_str)

        tx_data = data.get("transaction", {})
        merchant_data = data.get("merchant", {})
        payment_data = data.get("payment", {})
        audit_data = data.get("audit", {})

        # Parse date
        date_str = tx_data.get("date")
        if date_str:
            try:
                issue_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                issue_date = date.today()
        else:
            issue_date = date.today()

        # Parse time
        time_str = tx_data.get("time")
        issue_time = None
        if time_str:
            try:
                issue_time = datetime.strptime(time_str[:8], "%H:%M:%S").time()
            except ValueError:
                pass

        total_amount = Decimal(str(tx_data.get("total_amount", "0.00")))
        discount_amount = Decimal(str(tx_data.get("discount_amount", "0.00")))
        tax_amount = Decimal(str(tx_data.get("tax_amount", "0.00")))

        # Parse line items
        raw_items = data.get("items", [])
        items: List[ReceiptItem] = []
        for idx, item in enumerate(raw_items, start=1):
            qty = Decimal(str(item.get("quantity", "1.00")))
            u_price = Decimal(str(item.get("unit_price", "0.00")))
            tot_price = Decimal(str(item.get("total_price", "0.00")))
            items.append(
                ReceiptItem(
                    item_index=item.get("item_index", idx),
                    description=item.get("description", "Unknown Item").strip(),
                    quantity=qty,
                    unit_measure=item.get("unit_measure", "UN"),
                    unit_price=u_price,
                    total_price=tot_price,
                    category_code=item.get("category_code"),
                )
            )

        # Mathematical verification: sum of items vs reported total
        items_sum = sum((item.total_price for item in items), Decimal("0.00"))
        expected_total = (total_amount + discount_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        items_sum_quantized = items_sum.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        confidence = Decimal(str(audit_data.get("confidence_score", "0.95")))
        # If discrepancy exists between items sum and receipt total, adjust confidence
        if items and abs(items_sum_quantized - expected_total) > Decimal("0.05"):
            confidence = (confidence * Decimal("0.80")).quantize(Decimal("0.01"))

        target_entity = audit_data.get("target_entity_inferred", "HOUSEHOLD_OSMAR")
        receipt_id = f"rcp-vis-{uuid.uuid4().hex[:8]}"

        return Receipt(
            id=receipt_id,
            entity_code=target_entity,
            image_storage_path=image_path,
            merchant_name=merchant_data.get("name", "Unknown Merchant"),
            merchant_tax_id=merchant_data.get("tax_id"),
            issue_date=issue_date,
            issue_time=issue_time,
            total_amount=total_amount,
            tax_amount=tax_amount,
            discount_amount=discount_amount,
            payment_method=payment_data.get("method", "UNKNOWN"),
            card_last_digits=payment_data.get("card_last_digits"),
            fiscal_access_key=data.get("fiscal_access_key"),
            confidence_score=confidence,
            source_channel="CAMERA_PHOTO",
            parser_engine="VISION_AI",
            items=items,
        )

    def process_image_with_vision(
        self,
        image_path: str,
        provider_config: CustomProviderConfig,
        client: Optional[UniversalLLMClient] = None,
        system_prompt: Optional[str] = None,
    ) -> Receipt:
        """Reads a receipt image from disk, sends it to the Vision LLM, and parses the structured response."""
        client = client or UniversalLLMClient()

        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Receipt image not found at: {image_path}")

        # Determine MIME type
        ext = os.path.splitext(image_path)[1].lower()
        mime_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
        }
        mime_type = mime_map.get(ext, "image/jpeg")

        with open(image_path, "rb") as f:
            image_bytes = f.read()

        prompt_text = (
            "Analyze this receipt or fiscal cupom image. Extract all data into strictly formatted JSON "
            "matching the required OpenFamilyOffice schema. Verify all mathematical line-item additions."
        )

        sys_prompt = system_prompt or (
            "You are the OpenFamilyOffice Receipt Vision Parser. "
            "Output strictly valid JSON with no markdown wrapping and no preamble."
        )

        response = client.generate(
            config=provider_config,
            user_prompt=prompt_text,
            system_prompt=sys_prompt,
            image_data=image_bytes,
            image_mime_type=mime_type,
            temperature=0.0,
        )

        return self.parse_vision_json(response.content, image_path=image_path)

    def process_and_reconcile(
        self,
        receipt: Receipt,
        transactions: List[Transaction],
    ) -> Tuple[Receipt, Optional[Transaction], Optional[Transaction]]:
        """Matches the receipt against existing transactions to avoid double-counting.
        Returns:
            (receipt, matched_tx, new_tx_if_unmatched)
        """
        receipt, matched_tx = self.matcher.match_receipt(receipt, transactions)

        new_tx = None
        if not matched_tx:
            # Create a pending transaction record so the expense is tracked
            tx_id = f"tx-rcp-{receipt.id[-6:]}"
            category = (
                receipt.items[0].category_code
                if receipt.items and receipt.items[0].category_code
                else "PER.GROCERIES"
            )
            new_tx = Transaction(
                id=tx_id,
                entity_code=receipt.entity_code,
                account_name="Pending Receipt Reconciliation",
                date=receipt.issue_date,
                amount=-abs(receipt.total_amount),
                currency="BRL",
                raw_description=f"RECEIPT {receipt.merchant_name.upper()}",
                clean_description=f"Cupom {receipt.merchant_name} ({len(receipt.items)} itens)",
                category_code=category,
                counterparty=receipt.merchant_name,
                is_transfer=False,
                reconciliation_status="PENDING_RECONCILIATION",
                notes=f"[RECEIPT_ID: {receipt.id}] Captured via {receipt.parser_engine}",
            )

        return receipt, matched_tx, new_tx
