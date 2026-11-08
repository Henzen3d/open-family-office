# OpenFamilyOffice — Roadmap & Architectural Plans: Phases 7, 8, and 9

**Standard**: ASD-STE100 (~80% Plain English / Portuguese).  
**Entities Governed**:
1. `Fix Serviços MEI` (Osmar — Titular Exclusivo, LC 123/2006).
2. `Facilita Vistorias MEI` (Vera — Titular Exclusiva, LC 123/2006).
3. `Household PF` (Casal — Comunhão Parcial de Bens).

---

## 1. Phase 7: Automated Executive Reports & Multi-Channel Alerts

### 1.1 Objective
Deliver proactive financial alerts and weekly briefing documents without requiring manual dashboard login.

### 1.2 Channel Integration Architecture
- **Hermes Agent CLI / TUI**: Direct local push via socket or cron job (`cronjob_manage`).
- **Telegram Bot Webhook**: Self-hosted bot using TLS connection. No third-party relay.
- **WhatsApp Web (Local Baileys or Evolution API)**: Local container for household communication.

### 1.3 Trigger Rules & Thresholds
1. **MEI Revenue Ceiling Alert**:
   - Alert at 80% (R$ 64.800,00) of annual limit.
   - Critical alert at 95% (R$ 76.950,00) with advice to cease PJ emission until next calendar year.
2. **Weekly Executive Briefing**:
   - Executes every Sunday at 20:00 BRT.
   - Calculates 90-day cash runway across all three accounts.
   - Compares actual spending against historical averages.
3. **Pending Receipt Reminder**:
   - Sends notification when a debit card purchase $\ge$ R$ 50,00 lacks attached fiscal receipt for 48 hours.

### 1.4 Deliverables
- `src/intelligence/briefing_engine.py`: Dynamic report generator.
- `src/notification/dispatcher.py`: Channel router (Telegram, WhatsApp, Hermes TUI).
- `src/notification/rules_engine.py`: Rule evaluation engine.

---

## 2. Phase 8: Conjugal Governance & WebAuthn Dual-Signature

### 2.1 Objective
Enforce mutual consent and cryptographic authorization for high-value family capital allocation.

### 2.2 Legal & Governance Principles
- Fix Serviços MEI is legally owned only by Osmar.
- Facilita Vistorias MEI is legally owned only by Vera.
- Conjugal communion applies to matrimonial fruits (Código Civil, Art. 1.658).
- Capital transfers from PJ to PF $\ge$ R$ 1.000,00 require verification to avoid fiscal disqualification.

### 2.3 Cryptographic Quorum Architecture
1. **Key Generation**:
   - WebAuthn / FIDO2 Passkeys (Touch ID, Windows Hello, Face ID) generated per spouse.
   - Asymmetric Ed25519 signatures stored locally in `data/governance/signatures.json`.
2. **Dual-Signature Workflow**:
   - Spouse A requests transfer or expense approval.
   - System sends push alert to Spouse B.
   - Spouse B authorizes via biometric scan.
   - Transaction status changes from `PENDING_SPOUSAL_SIGNATURE` to `CONFIRMED`.
3. **Audit Trail**:
   - Immutable SHA-256 signature chain.
   - Time-stamped with local RTC counter.

### 2.4 Deliverables
- `src/security/webauthn_service.py`: WebAuthn registration and verification.
- `src/models/governance.py`: Dual-approval data models.
- `web/app/components/DualSignatureModal.tsx`: Visual approval dialog.

---

## 3. Phase 9: Offshore Wealth Accounting & Cross-Border Tax Compliance

### 3.1 Objective
Track international assets (USD, EUR, Stocks, ETFs) and automate Brazilian tax compliance under Lei 14.754/2023.

### 3.2 Target Brokers & Exchanges
- **Avenue Securities**: Apex clearing statement parser (CSV / PDF).
- **Interactive Brokers (IBKR)**: Activity Flex Query parser (XML / CSV).
- **Hardware Crypto Wallets**: Read-only public addresses for cold storage verification.

### 3.3 Fiscal & Calculation Rules
1. **Lei 14.754/2023 Compliance**:
   - Annual flat rate of 15% on offshore financial income.
   - Elimination of the previous R$ 35.000,00 monthly capital gains exemption for offshore assets.
2. **PTAX Conversion**:
   - Exchange rate fixed to BCB PTAX closing quote of transaction date.
3. **Carnê-Leão & DAA (Declaração de Ajuste Anual)**:
   - Automated generation of monthly DARF codes (Code 0190).
   - Export format compatible with Receita Federal IRPF software.

### 3.4 Deliverables
- `src/integrations/broker_parser.py`: Multi-currency statement ingester.
- `src/tax/offshore_calculator.py`: Lei 14.754/2023 tax engine.
- `web/app/components/OffshorePortfolioView.tsx`: Multi-currency portfolio tracker.

---

## 4. Execution Matrix & Priority Sequence

| Phase | Description | Prerequisite | Estimated Scope |
|---|---|---|---|
| **Phase 7** | Automated Executive Briefings & Multi-channel Alerts | Phases 4, 5, 6 | 4 Days |
| **Phase 8** | Conjugal Governance & Cryptographic Dual-Signature | Phase 7 | 5 Days |
| **Phase 9** | Offshore Investments & Cross-Border Tax (Lei 14.754) | Phase 8 | 6 Days |
