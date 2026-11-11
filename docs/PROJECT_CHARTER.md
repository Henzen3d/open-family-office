# Project Charter — OpenFamilyOffice

> **An open-source, multi-entity, lean family office & financial intelligence operating system for households, solopreneurs, MEIs, and small business owners worldwide.**

---

## 1. Executive Summary & Vision

Wealth management and corporate financial intelligence tools have historically been reserved for high-net-worth families (Private Family Offices) and large enterprises (ERP suites like SAP, NetSuite). On the other end of the spectrum, solopreneurs, freelancers, and small business owners juggle disconnected personal spreadsheets, disjointed banking apps, and chaotic corporate cash flows.

Recent AI demos (such as "autonomous AI finance teams") showcase alluring visions of synthetic CFOs. However, when deployed in the real world, most of these demos fail catastrophically:
1. **Mathematical Hallucination**: LLMs calculate cash runways, profit margins, and tax obligations in natural language, producing confident yet erroneous numbers.
2. **Context Blindness**: They fail to recognize the strict legal and fiscal separation between household personal finances (PF) and operating businesses (PJ).
3. **Absence of Reconciliation**: They treat internal transfers between accounts as income and double-count credit card payments as expenses.
4. **Disregard for Jurisdictional Realities**: They assume a generic US corporate structure (e.g., Stripe + QuickBooks), ignoring the regulatory nuances of jurisdictions like Brazil (MEI revenue limits, Simples Nacional, DAS, and anti-partner restrictions) or European freelancer statuses.

**OpenFamilyOffice** solves this problem by pioneering a **Deterministic-First, AI-Interpreted** architecture. It pairs mathematical precision (Python/SQL code calculations and double-entry invariants) with a specialized AI Advisory Council under human-in-the-loop governance.

---

## 2. Core Principles & Philosophy

### Principle 1: Deterministic Math, Cognitive AI (Code Calculates, AI Interprets)
* **Zero Math Hallucination**: Calculations for runway, burn rate, contribution margins, tax brackets, and 13-week cash flow forecasts are executed by deterministic code algorithms.
* **Interpretation & Strategy**: The AI Advisory Council consumes verified numeric outputs to detect anomalies, analyze trends, run qualitative scenario stress tests, and synthesize actionable 1-page executive briefings.

### Principle 2: Single Source of Truth & Multi-Entity Separation
* Every transaction, asset, liability, receivable, and payable belongs to an explicitly identified **Entity** (`entity_id`).
* The system enforces a strict boundary between:
  1. **Personal Household**: Living expenses, emergency reserve, family assets, long-term estate.
  2. **Operating Businesses**: Operational revenue, cost of goods/services, overhead, working capital, tax reserves.
* It completely prevents commingling (PF/PJ confusion) while providing a unified, high-level net worth dashboard for the family principals.

### Principle 3: Tri-Perspective Accounting
Financial reality cannot be captured by a single ledger view. OpenFamilyOffice simultaneously models:
1. **Cash Flow Perspective (Financeiro)**: When money actually enters and exits accounts; liquidity and runway management.
2. **Accrual / Managerial Perspective (Competência)**: When obligations and deliverables occur; true service profitability and unit margins.
3. **Balance Sheet / Wealth Perspective (Patrimonial)**: Total assets, liabilities, debt coverage, and inflation-adjusted purchasing power.

### Principle 4: Spec-Driven Development via Elephant-Goldfish Model (EGM)
* Designed under Google's **Elephant-Goldfish Model (EGM)** framework.
* **The Elephant**: Context-rich architectural documents maintain project memory, interface contracts, and design intent without premature code slop.
* **The Goldfish**: Stateless adversarial AI reviewers ruthlessly stress-test specifications, audit edge cases, and challenge assumptions (preventing echo chambers and false consensus).

### Principle 5: Human Sovereignty & Governance
* **Advisory Only**: AI agents prepare, synthesize, structure, and alert.
* **No Autonomous Movement of Capital**: The system never executes banking transfers, pays bills, or buys/sells investments autonomously.
* **Dual-Key Approval**: Family principals (e.g., Osmar & Vera) define spending authorization thresholds and retain 100% final approval authority on all financial actions.

### Principle 6: Local-First Privacy & Data Protection (LGPD / GDPR)
* Financial records represent the most sensitive data a family possesses.
* Multi-tiered data classification:
  * Highly sensitive transaction details are processed on-device via local deterministic rule engines and SQLite WAL ACID.
  * Cloud LLM interactions utilize sanitized, redacted, and aggregated payloads.

---

## 3. Project Scope & Boundaries

```
┌────────────────────────────────────────────────────────────────────────┐
│                        OPENFAMILYOFFICE SYSTEM                         │
├───────────────────────────────────┬────────────────────────────────────┤
│ IN SCOPE (What We Build)          │ OUT OF SCOPE (What We Avoid)       │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Multi-entity financial schema   │ • Autonomous banking execution     │
│ • Deterministic calculation engine│ • Holding custodial funds          │
│ • CSV, OFX, and Open Finance      │ • Certified legal/CPA substitute   │
│   data ingestion & reconciliation │ • High-frequency algorithmic       │
│ • Double-entry transfer validator │   trading or speculative stock tips│
│ • 7+1 AI Advisory Agent Suite     │ • Monolithic, opaque ERP setups    │
│ • Weekly 1-page executive briefs  │ • Storing unencrypted bank tokens  │
│ • Scenario stress-testing engine  │   or plain-text passwords          │
│ • Brazilian MEI/Simples & global  │                                    │
│   tax compliance modules          │                                    │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 4. Key Target Audiences

1. **Brazilian MEI & Microenterprises**:
   - Spouses running 1 or 2 small businesses alongside personal household finances (e.g., *Fix Serviços*, *Facilita Vistorias*).
   - Compliance with Brazilian Lei Complementar nº 238/2026 MEI limits (R\$ 81.000 in 2026, R\$ 110.000 in 2027, R\$ 140.000 in 2028).
   - Legal restrictions: Monitoring individual MEI registration and avoiding unauthorized partner co-holdings.
2. **Global Freelancers & Solopreneurs**:
   - Single-member LLCs, US 1099 independent contractors, UK Sole Traders, Spanish Autónomos, German Freiberufler.
   - Separation of consulting income, personal lifestyle burn rate, and quarterly tax reserves.
3. **Small Family Businesses Worldwide**:
   - Multi-generational or husband-and-wife partnerships requiring structured governance, clear dividend vs pro-labore withdrawals, and asset protection.

---

## 5. Success Metrics & System Evaluation

How do we prove OpenFamilyOffice delivers tangible value?

| Metric Category | Target Key Performance Indicator (KPI) |
|---|---|
| **Data Quality** | 100% reconciliation match between imported statements and ledger balance; 0 duplicate transfers. |
| **Time Efficiency** | Reduce monthly financial closing time from 8 hours to under 30 minutes. |
| **Operational Protection** | Maintain verified minimum runway (e.g., ≥ 6 months family reserve, ≥ 3 months business operating reserve). |
| **Decision Traceability** | 100% of weekly briefing recommendations backed by a verifiable data source and confidence rating (`Confirmed`, `Estimated`, `Pending`). |
| **Commercial Health** | Identification and correction of underpriced services and unprofitable clients within 30 days of data ingestion. |

