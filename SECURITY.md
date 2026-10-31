# SECURITY & THREAT MODEL

## Saudi Carry Charges & Customer Account Management System

### 1. Threat Model & Mitigations

| Threat | Risk Level | Target Area | Mitigation Strategy |
|---|---|---|---|
| **Unauthorized Data Access** | Critical | Database / API | Supabase Row Level Security (RLS) enabled on all tables; strict JWT role verification (`OWNER`, `STAFF`, `VIEWER`). |
| **IDOR (Insecure Direct Object Reference)** | High | Customers / Invoices | Server-side validation that requests only operate on records permitted by tenant/role context. |
| **Financial Tampering / Client Calculation Bypass**| High | Order & Invoice API | Server/database-side validation recalculates all line totals, subtotals, and grand totals prior to confirmation. |
| **Silent History Overwrite** | High | Invoices & Payments | Append-only ledger; immutable `invoice_revisions` table capturing snapshots, reasons, timestamps, and user IDs. |
| **Duplicate Payments / Race Conditions** | Medium | Payments API | Idempotency keys enforced via unique database constraints on payments. |
| **CSV / Formula Injection** | Medium | Reports Export | All exported text fields are sanitized and prepended with a quote if starting with `=`, `+`, `-`, or `@`. |
| **Exposed Secrets** | Critical | Frontend & Git | Service-role keys and administrative credentials never embedded in client bundles; strictly kept in environment variables. |
| **PDF Manipulation / Unauthorized Access** | Medium | Invoices & Statements | Dynamic generation from verified database snapshots; no unauthenticated public links. |

---

### 2. Role-Based Access Control (RBAC) Matrix

| Action | OWNER | STAFF | VIEWER |
|---|:---:|:---:|:---:|
| View Customers, Products, Invoices, Ledger | Yes | Yes | Yes |
| Create Customers & Catalog Products | Yes | Yes | No |
| Create & Confirm Orders | Yes | Yes | No |
| Record Payments | Yes | Yes | No |
| Edit Invoices & Post Revisions | Yes | Yes (logged) | No |
| Cancel Invoices / Post Ledger Adjustments | Yes | No | No |
| Modify Business Settings & Rates | Yes | No | No |
| Access Audit Logs | Yes | No | No |

---

### 3. Environment Variable Security Policy
- `.env` and secret keys MUST be excluded in `.gitignore`.
- Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public anon key with RLS enforcement) may be exposed to the client.
- The `SUPABASE_SERVICE_ROLE_KEY` is restricted exclusively to administrative migration tools and backend automation scripts.
