# Design Doc 01: Core Deterministic Ledger, Neutralization & AI Governance

**EGM Document ID**: `EGM-DESIGN-001`  
**Status**: Implemented & Verified  
**Phases Covered**: Phase 1 (Deterministic Core) & Phase 2 (Advisory Suite Core)  

---

## 1. Problem Statement & Motivation
Family financial systems and small business ledgers fail when:
1. LLMs perform hallucinated calculations for burn rates, cash runways, or tax liabilities.
2. Internal transfers between spouses or between personal accounts and corporate entities (e.g., Fix Serviços, Facilita Vistorias) are counted as artificial income and expense, distorting profitability.
3. Credit card statement settlements duplicate underlying itemized expenses.
4. Brazilian MEI revenue caps under Lei Complementar nº 238/2026 are breached without early warnings.

## 2. Architectural Design
- **Deterministic Code Calculates, AI Interprets**:
  - Python/SQL algorithms handle mathematical invariants.
  - Advisory Council (7+1 Agents) consumes verified JSON payloads to provide qualitative interpretation.
- **Components**:
  - `TransferNeutralizer`: Pairs debit and credit transactions within $\pm 48\text{h}$ window across accounts/entities.
  - `CardReconciler`: Identifies consolidated card invoice settlements and marks them as liability offsets rather than new expenses.
  - `RunwayCalculator`: Computes exact liquid runway (months and days) for Household essential burn vs. business operational overhead.
  - `MEITaxMonitor`: Tracks YTD gross receipts against legal ceilings (R$ 81k em 2026, R$ 110k em 2027, R$ 140k em 2028) with 80% caution triggers and anti-partner checks.
  - `CashFlowForecastEngine`: Generates rolling 13-week projections with lump-sum adjustments.

## 3. Verification Criteria
- 100% test pass rate across all accounting invariants.
- Zero AI hallucinations in numerical runway and tax calculations.
