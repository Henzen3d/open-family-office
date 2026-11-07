# Contributing to OpenFamilyOffice

Thank you for your interest in contributing to **OpenFamilyOffice**! 

OpenFamilyOffice is an open-source, multi-entity financial intelligence platform designed for families, solopreneurs, MEIs, and small businesses worldwide. We welcome contributions from developers, accountants, tax attorneys, UX designers, and financial planners.

---

## 1. Core Engineering Philosophy

Before contributing, please read our foundational architecture documents:
1. [`docs/PROJECT_CHARTER.md`](docs/PROJECT_CHARTER.md)
2. [`docs/FINANCIAL_DATA_ARCHITECTURE.md`](docs/FINANCIAL_DATA_ARCHITECTURE.md)
3. [`docs/AI_GOVERNANCE.md`](docs/AI_GOVERNANCE.md)
4. [`docs/EGM_DEVELOPMENT_SPEC.md`](docs/EGM_DEVELOPMENT_SPEC.md)

### The Inviolable Invariant
> **Deterministic Code Calculates, AI Interprets.**
> Calculations for runway, margins, cash forecasts, and tax brackets must be written in verifiable deterministic code (Python/SQL). LLMs must NEVER be tasked with mental arithmetic.

---

## 2. Elephant-Goldfish Model (EGM) Development Process

We practice **Spec-Driven Development (SDD)** following Google's Elephant-Goldfish Model:
1. **Design First**: Significant architectural modifications, schema changes, or new tax plugins require an approved `.md` specification before code PRs will be accepted.
2. **Adversarial Review (Goldfish)**: Pull requests will be audited not just for style, but for hidden assumptions, legal edge cases (e.g., MEI ownership limits), and commingling risks.

---

## 3. How to Contribute

### Adding Tax & Regulatory Plugins
We actively encourage tax modules for different jurisdictions:
* Brazil: Simples Nacional (Annex III & IV), Lucro Presumido, Carnê-Leão.
* United States: Schedule C, Single-Member LLC, 1099-NEC quarterly estimates.
* Spain / Latin America: Autónomos, IRPF, IVA Modelo 303, Monotributo.
* United Kingdom: Self Assessment Sole Trader rules.

### Submitting Pull Requests
1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Ensure all Markdown tables remain single-line per row for clean GitHub rendering.
3. Verify that all relative links resolve correctly on disk.
4. Ensure no mock files contain real Personal Identifiable Information (PII) or active banking credentials.
5. Submit a Pull Request with a clear summary of the architectural changes and test evidence.

---

## 4. Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project, you agree to abide by its terms. See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

