# EGM Design Documentation Sitemap — OpenFamilyOffice

> **Master Index mapping Elephant-Goldfish Model (EGM) Design Specifications to source implementations and system capabilities.**
> Maintained under Google's [Elephant-Goldfish Model](https://github.com/google/elephant-goldfish-model) specification-driven methodology.

---

## 1. Specification Index

| Design Doc | Status | Associated Phase | Primary Source Files | Summary |
|---|---|---|---|---|
| [`01_core_ledger_and_governance.md`](./01_core_ledger_and_governance.md) | **Implemented & Verified** | Phase 1 & 2 | `src/controller/`, `src/engine/`, `src/models/` | Deterministic double-entry foundation, transfer neutralizer, card reconciler, MEI monitor (LC 238/2026), 13-week runway, and 7+1 AI advisory prompts. |
| [`02_receipt_vision_and_public_apis.md`](./02_receipt_vision_and_public_apis.md) | **Implemented & Verified** | Phase 2 | `src/controller/receipt_processor.py`, `src/integrations/`, `src/llm/` | SEFAZ NFC-e QR-code decoder, multimodal Vision AI parser, bank anti-duplication matching, BCB rates, and free public APIs suite. |
| [`03_phase3_web_dashboard_and_banking.md`](./03_phase3_web_dashboard_and_banking.md) | **Drafting & Brainstorming** | Phase 3 | `src/web/`, `src/ingestion/ofx.py`, `src/ui/` | Lightweight local web UI, mobile photo upload endpoint, OFX/PDF statement parsing for Brazilian banks, and spousal approval flow. |

---

## 2. EGM Lifecycle Invariants

1. **Spec First, Zero Premature Code**: No production code or database schema is committed without an approved specification in `docs/designs/`.
2. **The Elephant Mandate**: The conversation session acts as the *Elephant*, retaining long-term memory, spousal requirements (Osmar & Vera), and business realities (Fix Serviços, Facilita Vistorias).
3. **The Goldfish Mandate**: An isolated, stateless subagent acts as the *Goldfish*, reviewing the draft specification cold on disk with zero chat bias before code execution begins.
