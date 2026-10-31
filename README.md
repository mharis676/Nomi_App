# Saudi Carry Charges & Customer Account Management System

Production-ready business management web application built strictly to track, invoice, and reconcile customer **Carry Charges** for goods transported from Saudi Arabia.

> **Scope Note:** In accordance with business rules, this application deals solely with carry charges. Original Saudi product costs and customer retail selling prices are excluded by design.

---

## Key Features
- **Product Catalog with Default Carry Charges**: Separate default charges per item, charging method (`PER_UNIT` vs `PER_ORDER`), with safe order-level overrides.
- **Customer Management**: Profiles, contact details, balance history, and archival protections.
- **Carry Order & Invoicing**: Automated calculation, line item snapshots, unique invoice numbering, and strict validation.
- **PDF Generation**: Invoices ("CARRY CHARGES INVOICE") and Account Statements with formatted currency (PKR default) and pagination.
- **Customer Account Ledger**: Immutable transaction history (debits, credits, adjustments, refunds) with verified running balances.
- **Payment Processing**: Full, partial, and advance payments (producing customer credits) with idempotency protection.
- **Invoice Revisions**: Immutable revision history with automated ledger adjustment reconciliation.
- **Real-Time Dashboard & Reporting**: Receivables, collections, customer advance credits, and CSV data exports.

---

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Bootstrap 5, Bootstrap Icons, React Router v6.
- **Database & Auth**: PostgreSQL / Supabase, Row Level Security (RLS), ACID Stored Procedures.
- **Precision Arithmetic**: `decimal.js` for rounding-error-free financial computations.
- **Testing**: Vitest (Unit & Domain), Playwright (E2E browser flows).

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase credentials (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`). When running without Supabase credentials, the application automatically uses the persistent browser/local simulated storage mode for offline testing and evaluation.

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Test Suites
```bash
npm run test
npm run typecheck
npm run build
```
