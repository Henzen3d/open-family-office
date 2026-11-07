# Receipt & Invoice Photo Ingestion Specification (OCR & NFC-e)

> **Technical Specification: Automated Receipt Capture, QR-Code/NFC-e Parsing, Entity Routing, and Bank Transaction Matching.**

---

## 1. Executive Summary & Problem Context

One of the largest points of friction in personal and small-business financial management is recording everyday cash and in-store expenses (supermarkets, hardware stores, fuel, dining, direct supplies). Waiting for the end of the month to manually type receipts from shoeboxes or wallets leads to lost deductions, forgotten cash expenses, and missing itemized breakdowns.

**OpenFamilyOffice** introduces a **Zero-Friction Receipt Photo Ingestion Pipeline**:
* The user snaps a smartphone photo of a receipt or invoice (e.g., supermarket receipt, electrical supply store ticket).
* The photo is sent via WhatsApp bot, Telegram bot, local web interface, or CLI.
* The system automatically parses the receipt using a **Dual-Engine Strategy**:
  1. **Deterministic QR-Code / NFC-e Reader** (Fast & 100% exact for Brazilian fiscal receipts).
  2. **Multimodal Vision AI / OCR Engine** (For conventional paper tickets, foreign receipts, and handwritten slips).
* The receipt is automatically categorized, assigned to the correct entity (Household vs. Fix Serviços vs. Facilita Vistorias), and **reconciled against bank/card transactions to eliminate duplicate entries**.

```mermaid
flowchart TD
    User(["📱 User takes photo of receipt"]) --> Upload["Ingestion Endpoint (Web / Telegram / WhatsApp / CLI)"]
    
    Upload --> CheckQR{"Contains Fiscal QR-Code?<br/>(NFC-e / SAT / Fiscal URL)"}
    
    CheckQR -->|Yes (Deterministic)| QRParse["1. QR-Code Decoder (SEFAZ API / Public Portal)<br/>100% Exact XML Data & Chave de Acesso"]
    CheckQR -->|No / International| VisionAI["2. Multimodal Vision AI Parser<br/>(Local Qwen2-VL / Ollama or Cloud Gemini/Claude)"]
    
    QRParse --> Normalize["Normalized Receipt Object (Merchant, CNPJ, Date, Items, Total, Payment Method)"]
    VisionAI --> Normalize
    
    Normalize --> EntityRoute["3. Entity & Category Router<br/>(Household vs Fix Serviços vs Facilita Vistorias)"]
    
    EntityRoute --> Matching{"4. Matching Bank/Card Transaction?<br/>(Same Date Window ± 48h & Same Total Amount)"}
    
    Matching -->|Match Found| Enrich["Attach Itemized Proof to Card Transaction<br/>(ZERO DUPLICATION: Prevents double expense)"]
    Matching -->|No Match / Cash| NewPending["Create Pending Transaction<br/>(Cash / Awaiting Bank Statement Sync)"]
    
    Enrich --> Governance["5. Human Approval / Spousal Review<br/>(One-click verification on Weekly Briefing)"]
    NewPending --> Governance
```

---

## 2. The Dual-Engine Ingestion Architecture

### Engine 1: Deterministic QR-Code / NFC-e Reader (Brazil Focus)
In Brazil, federal and state tax laws mandate that almost all retail and commercial receipts (*Nota Fiscal de Consumidor Eletrônica - NFC-e* and *SAT Fiscal*) include a standardized **2D QR-Code** and a 44-digit **Chave de Acesso**.

* **How it works**:
  1. The system scans the image using standard open-source computer vision (`pyzbar`, `opencv`).
  2. If a fiscal URL is decoded (e.g., `https://www.fazenda.../qrcode?p=...`), the engine parses the parameters or queries the state SEFAZ public consultation portal.
  3. **Zero Error Rate**: The receipt data (Issuer CNPJ, legal name, exact transaction timestamp, itemized SKU list, unit prices, tax amounts, and total) is retrieved from official government records with 100% mathematical determinism.

### Engine 2: Multimodal Vision AI Parser (Global & Non-Fiscal Receipts)
When a receipt lacks a QR-Code (e.g., credit card POS slip, US/European receipt, handwritten ticket, or damaged paper):

* **How it works**:
  1. The image is passed to a multimodal vision model (Local: `Qwen2-VL`, `Llava` via Ollama/NexusLocal; Cloud: `Gemini 1.5/2.0 Flash`, `Claude 3.5 Sonnet`, `GPT-4o`).
  2. The model extracts structured JSON following [`prompts/08_receipt_ocr_parser.md`](../prompts/08_receipt_ocr_parser.md).
  3. Extracts:
     - Merchant Name & Tax ID (CNPJ/EIN/VAT).
     - Date & Time.
     - Total Amount, Subtotal, and Taxes.
     - Payment Method (Credit Card, Debit, PIX, Cash).
     - Card Brand & Last 4 Digits (e.g., Mastercard `**** 1234`).
     - Line items with quantities and prices.

---

## 3. Intelligent Entity Routing (PF x PJ)

A major failure of generic receipt scanner apps is assuming all receipts belong to a single entity. In a family running microbusinesses, receipts have completely different legal and tax destinations:

| Receipt Type | Example Purchases | Target Entity | Accounting Destination |
|---|---|---|---|
| **Supermarket / Groceries** | Pão de Açúcar, Carrefour, Feira, Farmácia | `HOUSEHOLD_OSMAR` (Casa) | Personal Essential Living Expense (`PER.GROCERIES`) |
| **Electrical Supplies & Tools** | Fios, disjuntores, cabos, fita isolante, multímetro | `FIX_SERVICOS` (PJ) | Cost of Goods Sold (`EXP.COGS`) or Business Tools (`EXP.OPEX`) |
| **Inspection Equipment** | Trena a laser, prancheta, câmera, pilhas | `FACILITA_VISTORIAS` (PJ) | Startup Validation Operating Expense (`EXP.OPEX`) |
| **Fuel / Vehicle Maintenance** | Posto de Gasolina | **Rule-Based Allocation**: Split or assigned based on business mileage log |

### Entity Heuristics & Confirmation:
1. The AI suggests the entity based on merchant CNPJ category and item nature.
2. If ambiguous (e.g., office supplies or fuel), the system sends a quick one-tap Telegram/WhatsApp pill:
   `"Cupom de R$ 180,00 no Posto Shell: 1. Fix Serviços | 2. Casa | 3. Facilita"`
3. The answer is saved into persistent vendor rules (`vendor_entity_rules`) for future automatic routing.

---

## 4. The Anti-Duplication Matching Engine (Bank Transaction Pairing)

The most critical accounting invariant: **A receipt must NEVER create a duplicate expense if the purchase was made with a tracked bank card or PIX.**

### The Matching Algorithm:
1. When a receipt of **R\$ 450,00** from *Pão de Açúcar* on **Nov 6** is uploaded:
2. The controller searches the `transactions` table for:
   $$\text{Account} \in \text{Entity Accounts} \quad \text{AND} \quad |\text{Date}_{\text{receipt}} - \text{Date}_{\text{tx}}| \le 2\text{ days} \quad \text{AND} \quad \text{Amount} = -450.00$$
3. **If a match is found**:
   * The receipt is **LINKED** to the existing bank transaction.
   * The bank transaction is enriched with the itemized receipt data (e.g., breakdown of meat, dairy, cleaning supplies) and the image file path.
   * Net new expense created: **R\$ 0,00** (Zero Duplication).
4. **If NO match is found**:
   * If payment method was **CASH (Dinheiro)**: Creates a new confirmed cash outflow in `CASH_WALLET`.
   * If payment method was **CARD / PIX**: Creates a `PENDING_RECONCILIATION` transaction awaiting the next bank OFX/statement import. When the bank statement arrives, it automatically merges.

---

## 5. Relational Schema Extensions

```sql
-- Receipt Header
CREATE TABLE receipts (
    id UUID PRIMARY KEY,
    entity_code VARCHAR(50) NOT NULL REFERENCES entities(entity_code),
    image_storage_path TEXT NOT NULL,
    source_channel VARCHAR(30) DEFAULT 'WEB_UPLOAD', -- 'WHATSAPP', 'TELEGRAM', 'WEB_UPLOAD', 'CLI'
    parser_engine VARCHAR(30) NOT NULL,              -- 'QR_CODE_NFCE', 'VISION_AI_LOCAL', 'VISION_AI_CLOUD'
    fiscal_access_key VARCHAR(44),                  -- 44-digit Chave de Acesso (Brazil)
    merchant_name TEXT NOT NULL,
    merchant_tax_id TEXT,
    issue_date DATE NOT NULL,
    issue_time TIME,
    total_amount NUMERIC(18, 2) NOT NULL,
    tax_amount NUMERIC(18, 2) DEFAULT 0.00,
    payment_method VARCHAR(50),
    card_last_digits VARCHAR(4),
    matched_transaction_id UUID REFERENCES transactions(id),
    status VARCHAR(30) DEFAULT 'PENDING_APPROVAL',   -- 'MATCHED_TO_BANK', 'PENDING_BANK_MATCH', 'APPROVED_CASH', 'REJECTED'
    confidence_score NUMERIC(5, 4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Receipt Line Items
CREATE TABLE receipt_items (
    id UUID PRIMARY KEY,
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    item_index INT NOT NULL,
    description TEXT NOT NULL,
    sku_code TEXT,
    quantity NUMERIC(12, 4) DEFAULT 1.0000,
    unit_measure VARCHAR(10) DEFAULT 'UN',
    unit_price NUMERIC(18, 2) NOT NULL,
    total_price NUMERIC(18, 2) NOT NULL,
    category_code VARCHAR(50) REFERENCES categories(category_code)
);
```

---

## 6. Privacy & Security Safeguards

* **Local Storage First**: Photos are stored locally in the user's data directory (e.g., `data/receipts/YYYY/MM/`), excluded from git via `.gitignore`.
* **PII Redaction**: When using cloud multimodal APIs, customer personal CPF/Name printed on the receipt can be blurred or redacted prior to cloud transmission, or processed exclusively via local vision models (Ollama with `qwen2-vl` or `llava`).

