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

### 2.1 Corporate Architecture & Tax Separation (Brazil LC 123/2006, Art. 18-A)
- **Legal Invariant**: MEI cannot legally have partners or administrators who hold equity in any other business entity.
- **Ownership Separation**:
  - `Fix Serviços MEI`: Sole individual proprietorship under **Osmar** (CPF Osmar).
  - `Facilita Vistorias MEI`: Sole individual proprietorship under **Vera** (CPF Vera).
  - `Household (PF)`: Consolidated family balance sheet under civil marriage property regime ("tudo é nosso").
- **Fiscal Flow Protections**:
  - Resource movements between the two MEIs must NEVER occur directly as inter-company transfers (risk of fiscal co-mingling and joint liability).
  - Legitimate flow: Each MEI distributes exempt profits to its respective owner's personal account, and the household consolidates resources at the PF level under marriage governance.


## 3. Verification Criteria
- 100% test pass rate across all accounting invariants.
- Zero AI hallucinations in numerical runway and tax calculations.

