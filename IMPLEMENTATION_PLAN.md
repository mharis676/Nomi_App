# IMPLEMENTATION PLAN

## Master Project: Saudi Carry Charges & Customer Account Management System

### Summary of Execution Strategy
To guarantee complete adherence to the **Senior Developer Master Build Directive**, development is split into rigorous, gated phases. Each phase must meet its acceptance criteria, pass automated tests, and be documented before transitioning to the next phase.

---

### Phase Matrix & Status

| Phase | Description | Key Deliverables | Release Gate Status |
|---|---|---|---|
| **Phase 0** | Inspection & Planning | `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `QA_PLAN.md`, `SECURITY.md`, `.env.example` | **IN PROGRESS / MET** |
| **Phase 1** | Project Foundation & Tooling | Vite + React + TypeScript + Bootstrap 5 setup, Supabase Client & Local DB Simulation / Schema, Auth Provider, Vitest & Playwright Config | PENDING |
| **Phase 2** | Customers & Product Catalog | Customer management (CRUD, archive, search), Product catalog (CRUD, search, default carry charges, per-unit/per-order) | PENDING |
| **Phase 3** | Orders & Financial Engine | Order builder, carry charge calculation engine (decimal-safe arithmetic), one-time override, order confirmation transaction | PENDING |
| **Phase 4** | Invoices & PDF Engine | "CARRY CHARGES INVOICE" view, snapshot persistence, printable & downloadable PDF generator, pagination support | PENDING |
| **Phase 5** | Payments & Ledger Engine | Customer account ledger, continuous running balances, full/partial/advance payments, statements & PDF export | PENDING |
| **Phase 6** | Invoice Revisions & Audit | Immutable revision records, diff engine, ledger rebalancing, audit logging | PENDING |
| **Phase 7** | Dashboard & Analytics | Database-backed KPI metrics, filtering, reports (debits vs credits, receivables vs customer credits), CSV export | PENDING |
| **Phase 8** | Full QA, Security & Verification | End-to-end tests, financial test suite, responsive QA, security vulnerability scan, defect remediation | PENDING |
| **Phase 9** | Production Readiness & Release | Build bundle verification, backup/restore runbook, user guide, final Senior Dev handover report | PENDING |

---

### Detailed Task Breakdown

#### Phase 1: Tooling & Schema Foundation
1. Initialize Vite + React + TypeScript in `c:\Users\DELL\OneDrive\Desktop\Nomi APP`.
2. Install dependencies:
   - `bootstrap`, `bootstrap-icons`, `react-router-dom`
   - `@supabase/supabase-js`, `decimal.js`
   - `jspdf`, `jspdf-autotable`, `html2canvas`
   - Dev: `vitest`, `@testing-library/react`, `playwright`, `typescript`, `eslint`, `prettier`
3. Write initial migration SQL: `supabase/migrations/20261031000000_init_schema.sql` containing all tables, constraints, indexes, and RLS policies.
4. Establish environment config with `.env.example` and safe fallback client configuration.

#### Phase 2: Customers & Products
1. Implement Customer Model, Services, and UI (List, Create, Edit, Archive, Duplicate warnings).
2. Implement Product Model, Services, and UI (List, Create, Edit, Archive, default carry charges, charging method selection).
3. Add unit tests for Customer and Product validation.

#### Phase 3: Orders & Financial Engine
1. Implement decimal-safe financial calculation utilities in `src/utils/finance.ts`.
2. Order creation workflow:
   - Customer selection.
   - Dynamic product line additions.
   - Auto-loading default carry charges.
   - Order-specific price override toggle.
   - Server-equivalent recomputation logic.
3. Automated unit test suite verifying:
   - Per-unit calculations.
   - Per-order calculations.
   - Decimal rounding rules.
   - Discount boundaries.

#### Phase 4: Invoices & PDF Generation
1. Invoice viewer and renderer matching strict domain guidelines:
   - Prominent header: "CARRY CHARGES INVOICE".
   - Notice: "Carry charges only; product purchase/selling prices are not included."
   - Detailed itemization: quantity, carry rate, method, line total.
2. PDF export service with pagination and metadata.
3. Tests verifying PDF consistency against database snapshot.

#### Phase 5: Customer Ledger & Payments
1. Transaction ledger engine (`src/services/ledger.ts`).
2. Payment intake (Full, partial, advance credits).
3. Statement view with period filtering (Today, This Month, Custom).
4. Running balance calculations: `Closing = Opening + Debits - Credits`.
5. Unit tests for ledger integrity & mathematical invariants.

#### Phase 6: Invoice Revisions & Audit Logging
1. Invoice editor interface.
2. Immutable revision history table & diffing utility.
3. Ledger adjustment transaction:
   - Posting debit/credit differential.
   - Safeguarding against payment deletion.
   - Handling overpayments as advance credits.
4. Audit trail logging for all mutations.

#### Phase 7: Dashboard & Analytics
1. Aggregate queries for active customers, active products, total carry charges invoiced, total collections, outstanding balances, and customer advance credits.
2. Filterable dashboard views.
3. CSV export utility with formula-injection sanitization.

#### Phase 8 & 9: QA, Hardening & Handover
1. Execute full Vitest suite.
2. Execute Playwright E2E browser tests covering Scenarios A-G.
3. Generate `QA_REPORT.md`, `DEPLOYMENT.md`, `USER_GUIDE.md`.
4. Run production build check (`npm run build`).
5. Complete Senior Developer Final Handover Report.

