# OpenFamilyOffice — Agent & Review Style Guide

This repository follows Google's **Elephant-Goldfish Model (EGM)** for Spec-Driven Development (SDD) and deterministic financial systems design.

## 1. Core Architectural Invariants

* **Deterministic Financial Math**: Financial calculations (runway, margins, net worth, tax obligations, 13-week cash projections) MUST be performed by deterministic code (Python/SQL/TypeScript), NEVER generated directly from an LLM's internal weights. Agents interpret results, identify anomalies, and formulate strategies based on validated numbers.
* **Separation of Legal Entities**: Never conflate personal household finances (PF) with corporate entities (PJ). Every transaction, asset, receivable, and payable must link to a distinct `entity_id`.
* **Single-Line GitHub Markdown Tables**: Every Markdown table row must stay on a single line so GitHub renders properly.
* **Bilingual Parity**: Core project documentation should maintain equivalence between English (`README.md`, `docs/`) and Brazilian Portuguese (`README.pt-BR.md`).
* **Privacy & LGPD/GDPR**: Never commit or log real personal identifiable information (PII), full banking account numbers, passwords, API tokens, or raw bank statements. Use standard mock data in `templates/`.
* **EGM Review Philosophy**:
  * The **Elephant** holds architectural context and edits specs.
  * The **Goldfish** reviews independently with zero prior conversational bias, aggressively testing edge cases, legal constraints (such as Brazilian MEI limits or multi-entity ownership rules), and hidden fragility.

## 2. Review Rules

* Flag speculative claims, arithmetic performed by prompts without code grounding, missing entity identifiers, or missing human approval checkpoints.
* All relative links within documents must resolve to real files on disk.

