/swarm

# FINANCIAL PRODUCT EXCELLENCE — FULL UX/UI & FUNCTIONALITY AUDIT AND IMPROVEMENT

You are the coordinator of a multidisciplinary software engineering swarm.

Your mission is to audit, improve and validate the existing financial management application, transforming it into a polished, reliable and genuinely useful financial management platform for a family and two small businesses.

Do not treat this as merely a visual redesign.

The application must combine excellent UX/UI, real functionality, reliable financial data, intelligent document processing and a conversational AI assistant.

You are authorized to inspect, modify, implement and test the project.

## 1. PRODUCT CONTEXT

The application is used by Osmar and Vera.

It manages three financial contexts:

1. FAMILY — Osmar and Vera's shared personal finances.
2. FIX SERVIÇOS — MEI, registered under Osmar.
3. FACILITA VISTORIAS — MEI, registered under Vera.

The application must support both individual financial management and a consolidated family overview.

Each business must maintain its own financial records, accounts, tax information and transactions.

The current application already has:

- A dashboard.
- A conversational AI assistant.
- Document upload capabilities.
- An initial Financial Ledger and Reconciliation module.
- A visual navigation sidebar.
- Financial cards and charts.
- Some existing backend integrations.

However, several dashboard cards and navigation items are still mockups or display static information.

The Financial Ledger is one of the few components already connected to real financial information.

Do not assume the application is more functional than it actually is.

Inspect the repository and verify everything.

## 2. SWARM TEAM ORGANIZATION

Create specialized workers with independent responsibilities and non-overlapping file ownership.

### @ux-auditor — UX/UI Product Designer

Conduct a comprehensive usability and interface audit.

Evaluate:

- Visual hierarchy.
- Information architecture.
- Navigation.
- Dashboard organization.
- Typography.
- Spacing.
- Color consistency.
- Contrast.
- Component consistency.
- Accessibility.
- Responsive behavior.
- Desktop and mobile usability.
- Empty states.
- Loading states.
- Error states.
- User feedback.
- Interaction clarity.
- Cognitive load.

Examine the application visually using the available browser and screenshot capabilities.

Do not limit the evaluation to code inspection.

Determine whether users can understand what each element does without instructions.

Identify unnecessary cards, decorative controls, redundant information and confusing navigation.

The desired experience should feel like a professional financial management product, not a collection of disconnected dashboard widgets.

### @functional-auditor — Functional Product Engineer

Inspect all existing user-facing interactions.

Test:

- Sidebar navigation.
- Dashboard cards.
- Buttons.
- Filters.
- Document upload.
- Chat interactions.
- Financial queries.
- Confirmation flows.
- Ledger operations.
- Account management.
- Settings.
- Exports.
- Search.

Identify controls that are decorative, disconnected, incomplete or misleading.

Every visible button must perform a meaningful action.

If a feature is not implemented, do not pretend that it works.

Recommend the highest-value functionality improvements.

### @financial-architect — Financial Systems Architect

Review the financial domain and data integrity.

Verify:

- Family and business separation.
- CNPJ and ownership relationships.
- Transaction categorization.
- Bank account balances.
- Cash flow.
- Accounts payable.
- Accounts receivable.
- Credit card transactions.
- Internal transfers.
- Owner withdrawals.
- Business revenue.
- MEI revenue thresholds.
- Financial reconciliation.
- Duplicate transaction prevention.
- Document relationships.
- Financial reporting.

Pay particular attention to preventing:

- Transfers being counted as revenue or expenses.
- Credit card bill payments being counted twice.
- Unpaid bills reducing available cash prematurely.
- Receivables being treated as received money.
- Household transactions being assigned to the wrong business.
- Consolidated dashboards presenting misleading totals.

Do not invent financial data.

### @implementation — Full-Stack Implementation Engineer

After the initial audits are completed, implement the highest-value improvements.

Work only on clearly assigned files or packages.

Avoid modifying files owned by another worker without coordination through the shared board.

Prioritize improvements to:

1. Conversational AI and document processing.
2. Financial queries using real database information.
3. Dashboard functionality.
4. Navigation and functional pages.
5. Financial management workflows.
6. UX/UI refinement.

Preserve existing working features and architecture.

### @verifier — Independent QA and Code Reviewer

Review all implementation work.

Inspect the diffs and verify:

- No broken existing functionality.
- No duplicate implementations.
- No conflicting business rules.
- No fake financial values.
- No broken navigation.
- No TypeScript or build errors.
- No failed tests.
- No critical accessibility issues.
- No regressions.

Request corrections from the responsible worker when necessary.

## 3. PHASE A — INITIAL DISCOVERY AND SHARED AUDIT

Before editing code, inspect:

- Repository structure.
- Existing architecture.
- Frontend components.
- Backend endpoints.
- Database schema.
- AI assistant implementation.
- Document processing pipeline.
- Existing tests.
- Browser rendering.
- Current navigation.

Check Git status first.

Do not overwrite existing user changes or unrelated uncommitted work.

All auditors should initially work in read-only mode.

The coordinator must consolidate the findings and establish clear file ownership before parallel implementation.

Create an initial assessment containing:

- Critical problems.
- Functional gaps.
- UX/UI problems.
- Data integrity risks.
- Quick wins.
- Larger architectural improvements.

Prioritize by user impact rather than implementation convenience.

## 4. PHASE B — CORE USER EXPERIENCE

The AI assistant is the primary interaction point of this application.

Users should be able to perform most daily financial operations through natural conversation.

Evaluate and improve:

### Conversational interface

- Chat available throughout the application.
- Clear message hierarchy.
- Good attachment experience.
- Image and PDF previews.
- Upload progress.
- Processing feedback.
- Error recovery.
- Confirmation cards.
- Conversation history.
- Good readability.
- Useful structured responses.

### Document intelligence

The user should be able to send:

- Receipts.
- Invoices.
- NFC-e and NF-e XML.
- Service invoices.
- Bank statements.
- Credit card bills.
- Payment receipts.
- PDF documents.
- Photos of receipts and invoices.

The assistant should extract available information and suggest the correct financial classification.

Present extracted information for human confirmation before creating uncertain or potentially consequential financial records.

Prevent duplicate entries.

Preserve original documents.

### Financial questions

The assistant should answer questions using real application data.

Examples:

- How much did we spend this month?
- How much did Fix Serviços earn this year?
- What is the current balance across our accounts?
- What is our household spending on groceries?
- What bills are overdue?
- How much revenue has Facilita generated?
- Which business has the highest operating costs?
- How much have we withdrawn from each business?

Never generate financial answers from invented numbers.

The backend must execute calculations and controlled queries.

## 5. PHASE C — DASHBOARD AND NAVIGATION

Review the existing dashboard and determine which components should be:

- Improved.
- Reorganized.
- Simplified.
- Replaced.
- Removed.

Evaluate the following:

1. Account balances.
2. Liquidity and reserves.
3. MEI revenue monitor.
4. Family governance.
5. Quick transfers.
6. Financial ledger.
7. Financial movement chart.

All displayed figures must come from real database information.

Provide clear empty states when information is unavailable.

Create meaningful navigation destinations for all visible sidebar controls.

The interface should allow the user to navigate between:

- Dashboard.
- Financial ledger.
- Pending documents.
- Accounts and cards.
- Accounts payable.
- Accounts receivable.
- Reports.
- Family governance.
- Settings.

Do not add pages merely to fill the menu.

Each destination must contain useful functionality.

## 6. PHASE D — UX/UI POLISH

Preserve the existing visual identity where possible.

Do not redesign the application without a demonstrable usability benefit.

Improve:

- Layout consistency.
- Responsive grids.
- Card hierarchy.
- Tables.
- Data density.
- Charts.
- Filters.
- Buttons.
- Modals.
- Forms.
- Notification feedback.
- Loading states.
- Mobile layouts.

The design must be professional, clean, modern and trustworthy.

Prioritize clear financial information over decorative effects.

Avoid excessive gradients, unnecessary animations, oversized headings and visual clutter.

Make important information immediately understandable.

For every significant workflow, examine how many actions the user must perform and eliminate unnecessary steps.

## 7. PHASE E — REAL FUNCTIONALITY

Implement the most valuable improvements supported by the existing architecture.

Prioritize complete user workflows over isolated UI components.

Examples:

- Upload document → extract data → review → confirm → save → update dashboard.
- Ask financial question → query database → calculate → return sourced answer.
- Register payable → track due date → confirm payment → update ledger.
- Import statement → identify transactions → reconcile → update balances.

A feature is only complete when its complete underlying workflow works.

Never use hardcoded values to make an unfinished feature appear operational.

## 8. QUALITY AND SAFETY RULES

- Do not expose sensitive financial information.
- Never store bank credentials.
- Do not initiate real payments or transfers.
- Require explicit human approval for sensitive actions.
- Keep an audit trail.
- Preserve the original financial documents.
- Do not delete real records as part of cleanup.
- Use test data in development and testing.
- Do not modify production financial records.
- Make database migrations safe and reversible whenever possible.
- Do not change business tax rules without verified sources and effective dates.

## 9. ACCEPTANCE TESTS

Test complete workflows, not just individual buttons.

At minimum:

1. Upload a receipt through the chat.
2. Extract its value, date and merchant.
3. Suggest a category and financial entity.
4. Confirm the transaction.
5. Verify its inclusion in the ledger.
6. Query the transaction through the assistant.
7. Verify that the dashboard reflects the actual financial record.
8. Upload the same document again and test duplicate detection.
9. Import a structured XML invoice.
10. Register and settle a payable without duplicating its expense.
11. Register a transfer without creating artificial revenue or expenses.
12. Switch between family, Fix and Facilita views.
13. Verify consolidated totals.
14. Navigate through every menu item.
15. Test the interface at desktop, tablet and mobile widths.

Record any tests that cannot be executed because of missing credentials or integrations.

Do not report unexecuted tests as passed.

## 10. FINAL DELIVERABLES

The coordinator must deliver:

1. Overall UX/UI assessment.
2. Functional audit.
3. Financial data integrity assessment.
4. List of identified problems, ranked by severity.
5. Summary of implemented improvements.
6. Files and components modified.
7. Tests performed and their results.
8. Screenshots or visual comparisons when available.
9. Remaining limitations.
10. Recommended next improvements.

Use a severity scale:

- P0 — Critical.
- P1 — High.
- P2 — Medium.
- P3 — Low.

## 11. EXECUTION DIRECTIVE

Be proactive and work collaboratively.

The initial audit must be completed before implementation begins.

After the coordinator establishes file ownership and priorities, implement changes in parallel wherever files and dependencies permit.

Do not let multiple workers independently rewrite the same components.

The verifier must independently inspect the final implementation and request corrections where necessary.

Do not stop after producing recommendations.

Implement the highest-value improvements that can be completed safely in the current scope.

The ultimate objective is to create an excellent, dependable financial application that Osmar and Vera can genuinely use every day.

**Think like a senior product team building a premium financial management platform, not like developers simply decorating a dashboard.**