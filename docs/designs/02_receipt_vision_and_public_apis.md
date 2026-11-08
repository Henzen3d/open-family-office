# Design Doc 02: Receipt OCR Ingestion, Public APIs & Provider Registry

**EGM Document ID**: `EGM-DESIGN-002`  
**Status**: Implemented & Verified  
**Phases Covered**: Phase 2 (Receipt Ingestion & Macroeconomic Grounding)  

---

## 1. Problem Statement & Motivation
Users need to record on-the-go expenses (grocery trips, tool purchases for Fix Serviços, equipment for Facilita Vistorias) with zero friction:
1. Physical paper receipts and NFC-e slips get lost before manual entry.
2. Direct OCR often hallucinates numbers or items.
3. Card purchases recorded via receipt photo must not duplicate transactions already imported from bank statements.
4. AI models must be grounded in daily official Brazilian macroeconomic indicators (Selic, Dólar PTAX, IPCA) and public market data without costly subscriptions.

## 2. Architectural Design
- **Dual-Engine Receipt Capture**:
  - *Engine 1 (NFC-e QR / SEFAZ)*: Decodes 44-digit Brazilian SEFAZ access key and standard pipe-delimited parameters (`p=...`), extracting issuance date, state UF, CNPJ, series, and total amount.
  - *Engine 2 (Multimodal Vision AI)*: Sends receipt images (base64) to Vision LLMs using standardized JSON schema (`prompts/08_receipt_ocr_parser.md`). Verifies line-item summation against reported total.
- **Bank Anti-Duplication Reconciler**:
  - `ReceiptMatcher`: Searches transaction log within $\pm 48\text{h}$ of receipt date for equal debit amount.
  - If match found: Enriches bank transaction with line items and sets `MATCHED_TO_BANK` (preventing double counting).
  - If no match found: Creates pending record with status `PENDING_RECONCILIATION`.
- **Public APIs Suite & Macro Grounding**:
  - Official BCB SGS API client (Selic, Dólar PTAX, IPCA 12M).
  - Curated endpoints from `public-apis/public-apis`: AwesomeAPI & Frankfurter (FX), Coinbase (Crypto), BrasilAPI (CNPJ & Feriados bancários).
  - Sliding-window proactive rate-limiting (80% threshold) and dynamic provider registration supporting OpenAI and Anthropic protocols.

## 3. Verification Criteria
- Verified extraction of Brazilian SEFAZ 44-digit keys.
- Mathematical validation of receipt item totals.
- Zero duplication when matching receipts to bank transactions.

