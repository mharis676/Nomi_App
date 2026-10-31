# SYSTEM ARCHITECTURE DOCUMENT

## Project: Saudi Carry Charges & Customer Account Management System

### 1. Overview
A specialized, secure web application designed specifically to manage, invoice, and track **carry charges** for products brought from Saudi Arabia to Pakistan (or other destinations).

> **Critical Domain Boundary:**
> This system is strictly limited to **Carry Charges**. It deliberately excludes original Saudi product purchase costs, retail selling prices, and merchant merchandise profit. All invoices, statements, and reports explicitly declare this scope.

---

### 2. High-Level Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend Framework** | React 18 / Vite / TypeScript | Fast compilation, strong type safety, modern ecosystem |
| **UI Design System** | Bootstrap 5 + Bootstrap Icons | Clean, responsive layout for mobile, tablet, and desktop |
| **Routing** | React Router v6 | Client-side SPA routing with protected role-based routes |
| **State & Data Access** | Supabase JS Client + React Hooks / Context | Real-time capabilities, typed client, clean auth session handling |
| **Backend & Storage** | Supabase (PostgreSQL 15) | Relational integrity, ACID transactions, Row-Level Security (RLS) |
| **Calculations** | Decimal-safe arithmetic module (`decimal.js` / custom integer minor units) | Eliminates IEEE 754 floating-point rounding bugs |
| **Document Generation**| HTML5 Canvas / jsPDF / Print Stylesheets | Consistent vector/raster output matching saved database snapshots |
| **Testing** | Vitest + Playwright | Unit, financial domain, reconciliation, and browser E2E tests |

---

### 3. Application Architecture Diagram

```
+---------------------------------------------------------------------------------+
|                                 CLIENT TIER                                     |
|  +---------------------------------------------------------------------------+  |
|  | React 18 + TypeScript + Bootstrap 5 (Responsive: Desktop / Tablet / Phone)|  |
|  | Pages: Dashboard, Customers, Products, New Order, Invoices, Ledger, Reports|  |
|  +---------------------------------------------------------------------------+  |
|         |                                          |                            |
|         v                                          v                            |
|  +-------------------------------+      +------------------------------------+  |
|  | Decimal-Safe Financial Engine |      | In-Browser / PDF Generator (jsPDF) |  |
|  | - Per-unit & per-order math   |      | - Carry Charges Invoices           |  |
|  | - Snapshot calculation        |      | - Customer Account Statements      |  |
|  +-------------------------------+      +------------------------------------+  |
+---------------------------------------------------------------------------------+
                                      |
                            Secure HTTPS / TLS
                                      |
+---------------------------------------------------------------------------------+
|                           DATABASE & BACKEND TIER                               |
|                         (PostgreSQL 15 on Supabase)                             |
|  +---------------------------------------------------------------------------+  |
|  | Supabase Auth (JWT, Role Claims: OWNER, STAFF, VIEWER)                   |  |
|  +---------------------------------------------------------------------------+  |
|  | Row Level Security (RLS) Policies on Every Table                          |  |
|  +---------------------------------------------------------------------------+  |
|  | Stored Procedures / RPC Functions (ACID Financial Transactions):          |  |
|  |  - confirm_order_and_generate_invoice()                                   |  |
|  |  - record_customer_payment()                                              |  |
|  |  - create_invoice_revision()                                              |  |
|  +---------------------------------------------------------------------------+  |
|  | Core Tables:                                                              |  |
|  |  - profiles                                                               |  |
|  |  - customers                                                              |  |
|  |  - products (catalog & default carry charges)                             |  |
|  |  - orders & order_items                                                   |  |
|  |  - invoices & invoice_revisions                                           |  |
|  |  - payments                                                               |  |
|  |  - customer_transactions (immutable ledger)                              |  |
|  |  - business_settings                                                      |  |
|  |  - audit_logs                                                             |  |
+---------------------------------------------------------------------------------+
```

---

### 4. Database Schema Specification

#### 4.1 Profiles & Roles
- `profiles`:
  - `id` (UUID, PK, references `auth.users`)
  - `full_name` (TEXT)
  - `role` (TEXT: `'OWNER'`, `'STAFF'`, `'VIEWER'`)
  - `created_at` (TIMESTAMPTZ)
  - `updated_at` (TIMESTAMPTZ)

#### 4.2 Customers
- `customers`:
  - `id` (UUID, PK)
  - `customer_code` (TEXT, UNIQUE)
  - `full_name` (TEXT, NOT NULL)
  - `phone` (TEXT)
  - `address` (TEXT)
  - `notes` (TEXT)
  - `opening_balance` (NUMERIC(14, 2), DEFAULT 0.00)
  - `is_active` (BOOLEAN, DEFAULT true)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

#### 4.3 Products Catalog
- `products`:
  - `id` (UUID, PK)
  - `sku` (TEXT, UNIQUE)
  - `name` (TEXT, NOT NULL)
  - `category` (TEXT)
  - `default_carry_charge` (NUMERIC(14, 2), NOT NULL CHECK (default_carry_charge >= 0))
  - `charge_method` (TEXT, CHECK (charge_method IN ('PER_UNIT', 'PER_ORDER')))
  - `currency` (TEXT, DEFAULT 'PKR')
  - `notes` (TEXT)
  - `is_active` (BOOLEAN, DEFAULT true)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

#### 4.4 Orders & Order Items
- `orders`:
  - `id` (UUID, PK)
  - `order_number` (TEXT, UNIQUE)
  - `customer_id` (UUID, references `customers`)
  - `status` (TEXT: `'DRAFT'`, `'CONFIRMED'`, `'CANCELLED'`)
  - `currency` (TEXT, DEFAULT 'PKR')
  - `subtotal` (NUMERIC(14, 2))
  - `discount` (NUMERIC(14, 2), DEFAULT 0.00)
  - `additional_charges` (NUMERIC(14, 2), DEFAULT 0.00)
  - `total_carry_charge` (NUMERIC(14, 2))
  - `notes` (TEXT)
  - `created_by` (UUID, references `profiles`)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

- `order_items`:
  - `id` (UUID, PK)
  - `order_id` (UUID, references `orders` ON DELETE CASCADE)
  - `product_id` (UUID, references `products`)
  - `product_name_snapshot` (TEXT, NOT NULL)
  - `quantity` (NUMERIC(12, 2), NOT NULL CHECK (quantity > 0))
  - `charge_method` (TEXT, CHECK (charge_method IN ('PER_UNIT', 'PER_ORDER')))
  - `carry_charge` (NUMERIC(14, 2), NOT NULL CHECK (carry_charge >= 0))
  - `line_total` (NUMERIC(14, 2), NOT NULL)
  - `created_at` (TIMESTAMPTZ)

#### 4.5 Invoices & Revisions
- `invoices`:
  - `id` (UUID, PK)
  - `invoice_number` (TEXT, UNIQUE)
  - `order_id` (UUID, references `orders`)
  - `customer_id` (UUID, references `customers`)
  - `issue_date` (DATE NOT NULL)
  - `currency` (TEXT, DEFAULT 'PKR')
  - `subtotal` (NUMERIC(14, 2))
  - `discount` (NUMERIC(14, 2), DEFAULT 0.00)
  - `additional_charges` (NUMERIC(14, 2), DEFAULT 0.00)
  - `grand_total` (NUMERIC(14, 2))
  - `amount_paid` (NUMERIC(14, 2), DEFAULT 0.00)
  - `current_revision` (INTEGER, DEFAULT 1)
  - `status` (TEXT: `'UNPAID'`, `'PARTIAL'`, `'PAID'`, `'REVISED'`, `'CANCELLED'`)
  - `snapshot_data` (JSONB NOT NULL)
  - `created_by` (UUID, references `profiles`)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

- `invoice_revisions`:
  - `id` (UUID, PK)
  - `invoice_id` (UUID, references `invoices` ON DELETE CASCADE)
  - `revision_number` (INTEGER NOT NULL)
  - `previous_snapshot` (JSONB NOT NULL)
  - `new_snapshot` (JSONB NOT NULL)
  - `previous_total` (NUMERIC(14, 2) NOT NULL)
  - `new_total` (NUMERIC(14, 2) NOT NULL)
  - `difference` (NUMERIC(14, 2) NOT NULL)
  - `reason` (TEXT NOT NULL)
  - `revised_by` (UUID, references `profiles`)
  - `created_at` (TIMESTAMPTZ)

#### 4.6 Payments
- `payments`:
  - `id` (UUID, PK)
  - `payment_number` (TEXT, UNIQUE)
  - `customer_id` (UUID, references `customers`)
  - `invoice_id` (UUID, references `invoices`, NULLABLE for advance payments)
  - `payment_date` (DATE NOT NULL)
  - `amount` (NUMERIC(14, 2) NOT NULL CHECK (amount > 0))
  - `payment_method` (TEXT: `'CASH'`, `'BANK_TRANSFER'`, `'ONLINE'`)
  - `reference_number` (TEXT)
  - `notes` (TEXT)
  - `idempotency_key` (TEXT, UNIQUE)
  - `created_by` (UUID, references `profiles`)
  - `created_at` (TIMESTAMPTZ)

#### 4.7 Customer Transactions (Ledger)
- `customer_transactions`:
  - `id` (UUID, PK)
  - `customer_id` (UUID, references `customers`)
  - `transaction_date` (TIMESTAMPTZ NOT NULL)
  - `transaction_type` (TEXT: `'INVOICE'`, `'PAYMENT'`, `'ADJUSTMENT'`, `'REFUND'`, `'OPENING_BALANCE'`)
  - `reference_id` (UUID) -- FK to invoices, payments, or revisions
  - `reference_code` (TEXT) -- E.g. INV-2026-0001, PAY-2026-0001
  - `description` (TEXT NOT NULL)
  - `debit` (NUMERIC(14, 2), DEFAULT 0.00)
  - `credit` (NUMERIC(14, 2), DEFAULT 0.00)
  - `created_by` (UUID, references `profiles`)
  - `created_at` (TIMESTAMPTZ)

#### 4.8 Business Settings & Audit Logs
- `business_settings`:
  - `id` (UUID, PK)
  - `business_name` (TEXT)
  - `phone` (TEXT)
  - `email` (TEXT)
  - `address` (TEXT)
  - `logo_url` (TEXT)
  - `currency` (TEXT, DEFAULT 'PKR')
  - `invoice_footer_note` (TEXT)
  - `updated_at` (TIMESTAMPTZ)

- `audit_logs`:
  - `id` (UUID, PK)
  - `action` (TEXT NOT NULL)
  - `table_name` (TEXT NOT NULL)
  - `record_id` (TEXT)
  - `actor_id` (UUID, references `profiles`)
  - `payload` (JSONB)
  - `created_at` (TIMESTAMPTZ)

---

### 5. Financial Calculation Rules
1. **Per-Unit Rule**:
   $$\text{Line Total} = \text{round}(\text{Quantity} \times \text{Carry Charge Per Unit}, 2)$$
2. **Per-Order Rule**:
   $$\text{Line Total} = \text{round}(\text{Carry Charge For Order}, 2)$$
3. **Grand Total**:
   $$\text{Grand Total} = \sum \text{Line Totals} - \text{Discount} + \text{Additional Charges}$$
4. **Customer Ledger Balance**:
   $$\text{Closing Balance} = \text{Opening Balance} + \sum \text{Debits} - \sum \text{Credits}$$
   - Positive Balance: Customer owes business (Receivable).
   - Zero: Settle.
   - Negative Balance: Customer has advance credit (Customer Advance).

