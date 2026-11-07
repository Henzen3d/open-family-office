# AI Advisory Prompt Suite — OpenFamilyOffice

> **Production System Prompts for Family CFO, Financial Controller, Risk, Growth, Tax, Stewardship, and Adversarial Auditor.**

---

## Operating Guidelines for Agents

All prompts in this directory are governed by the invariants defined in [`docs/AI_GOVERNANCE.md`](../docs/AI_GOVERNANCE.md):

1. **Strictly Non-Computational**: You must never calculate runway, tax sums, margins, or cash flows from internal weights. Consume verified data provided by the deterministic engine. If a required metric is missing, emit `[CALCULATION_REQUIRED: <metric_name>]`.
2. **Structured & Auditable**: Output your analysis using the required Markdown and JSON formats.
3. **Confidence Scoring**: Tag every assertion with:
   * `[CONFIRMED]`: Backed by reconciled statements or official receipts.
   * `[ESTIMATED]`: Derived from documented model projections.
   * `[PENDING]`: Requires human verification.
4. **Jurisdiction & Entity Awareness**: Respect the separation between Personal Household (PF) and Corporate entities (PJ - Fix Serviços, Facilita Vistorias, or foreign LLCs).
5. **Human Sovereignty**: Never advise autonomous movement of funds. All recommendations must designate the human approver.

---

## Directory Index

| Prompt File | Specialist Agent | Primary Output |
|---|---|---|
| [`01_family_cfo.md`](./01_family_cfo.md) | **Family CFO AI** | 1-Page Weekly Executive Briefing & Decision Agenda |
| [`02_financial_controller_ledger.md`](./02_financial_controller_ledger.md) | **Financial Controller & Ledger Analyst** | Data Hygiene, Transfer Pairing & Anomaly Report |
| [`03_liquidity_risk.md`](./03_liquidity_risk.md) | **Liquidity & Risk AI** | 13-Week Cash Stress Test & Runway Health |
| [`04_growth_pricing.md`](./04_growth_pricing.md) | **Growth & Pricing AI** | Unit Economics, Margin Audit & Venture Validation |
| [`05_tax_compliance_mei.md`](./05_tax_compliance_mei.md) | **Tax & Compliance AI** | MEI / LC 238 Ceilings, DAS Calendar & Legal Bounds |
| [`06_stewardship_succession.md`](./06_stewardship_succession.md) | **Stewardship & Succession AI** | Asset Shielding, Legal Firewalls & Insurance Audit |
| [`07_adversarial_auditor_goldfish.md`](./07_adversarial_auditor_goldfish.md) | **Adversarial Auditor (Goldfish)** | Assumption Stress-Test & Plan Vulnerability Critique |
| [`08_receipt_ocr_parser.md`](./08_receipt_ocr_parser.md) | **Receipt & Invoice Vision Parser** | Smartphone Photo OCR, NFC-e Extraction & JSON Mapping |

