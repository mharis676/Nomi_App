# USER GUIDE & OPERATING PROCEDURES

## Saudi Carry Charges & Customer Account Management System

### 1. Scope and Core Purpose
This system is created to manage, calculate, invoice, and track **carry charges** for items brought from Saudi Arabia to Pakistan.

> **Important:** This system does **NOT** record Saudi product purchase prices or retail selling prices. It manages only freight and carry charges.

---

### 2. User Roles
- **Owner**: Full administrative control, modifying business settings, viewing audit logs, editing invoices, issuing refunds, and cancelling invoices.
- **Staff**: Operational access to register customers, manage product rates, create carry orders, and record customer payments.
- **Viewer**: Read-only oversight for accounting or audit verification.

---

### 3. Step-by-Step Workflows

#### 3.1 Managing Product Carry Rates
1. Navigate to **Carry Catalog** in the top navigation.
2. Click **Add New Product**.
3. Enter the product name (e.g., *Ajwa Al-Madinah VIP Dates (1 Kg Box)*).
4. Select the Charging Method:
   - **Per Unit**: Applied per piece/kg (e.g., PKR 650/kg).
   - **Per Order Flat Rate**: Fixed consignment rate for the order regardless of item count (e.g., PKR 2,500/box).
5. Click **Add to Catalog**.

#### 3.2 Creating a Customer Carry Order & Invoice
1. Click **New Carry Order**.
2. Select an existing customer or create a new customer profile.
3. Click **Add Product from Catalog**.
4. Adjust the Quantity. The system automatically loads the catalog default carry rate and computes the line total.
5. If an order-specific rate is negotiated, edit the **Carry Rate** directly. The badge will indicate *One-time Override*. The catalog default will not be affected.
6. Enter any discount or additional handling fees if applicable.
7. Click **Confirm Order & Invoice**.
8. The system will:
   - Issue a unique invoice number (e.g., `INV-2026-0001`).
   - Post a debit charge to the customer's continuous ledger.
   - Redirect to the printable and downloadable PDF invoice view.

#### 3.3 Recording Payments & Managing Balances
1. Open **Payments** or open the specific customer's account page.
2. Click **Record Payment**.
3. Choose whether to allocate the payment to a specific invoice or apply it directly to the customer's general account.
4. Enter the amount, payment method (Cash, Bank Transfer, Online), date, and reference number.
5. Click **Confirm & Post Payment**.
6. The customer's outstanding balance immediately decreases. If the payment exceeds the current balance, the customer retains an **Advance Credit**.

#### 3.4 Revising an Invoice
1. Open the invoice you wish to modify.
2. Click **Edit / Revise**.
3. Adjust quantities or rates as agreed with the client.
4. Enter the **Mandatory Reason for Revision**.
5. Click **Save Revision & Reconcile Ledger**.
6. An immutable revision record (`v2`, `v3`, etc.) is recorded, and the difference is automatically posted to the customer ledger as a balancing adjustment without disturbing historical payment records.

#### 3.5 Generating Account Statements
1. Navigate to **Customers & Ledger**.
2. Click on the customer name or click **Ledger**.
3. Select an optional date filter or leave blank for complete history.
4. Click **Download Statement PDF** to generate an official branded PDF statement with opening balance, debits, credits, and closing balance.
