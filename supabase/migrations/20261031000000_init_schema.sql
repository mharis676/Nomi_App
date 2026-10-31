-- Migration: 20261031000000_init_schema.sql
-- Saudi Carry Charges & Customer Account Management System
-- Database Schema and Row Level Security (RLS) Setup

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'STAFF', 'VIEWER')) DEFAULT 'STAFF',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    notes TEXT,
    opening_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(full_name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_active ON public.customers(is_active);

-- 4. Products Table (Strictly Carry Charges)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    default_carry_charge NUMERIC(14, 2) NOT NULL CHECK (default_carry_charge >= 0),
    charge_method TEXT NOT NULL CHECK (charge_method IN ('PER_UNIT', 'PER_ORDER', 'PER_KG')) DEFAULT 'PER_UNIT',
    currency TEXT NOT NULL DEFAULT 'PKR',
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

-- 5. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')) DEFAULT 'DRAFT',
    currency TEXT NOT NULL DEFAULT 'PKR',
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    additional_charges NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (additional_charges >= 0),
    total_carry_charge NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_carry_charge >= 0),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- 6. Order Items (Snapshotting product data and charges)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    product_name_snapshot TEXT NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    charge_method TEXT NOT NULL CHECK (charge_method IN ('PER_UNIT', 'PER_ORDER', 'PER_KG')),
    weight_kg NUMERIC(12, 3),
    carry_charge NUMERIC(14, 2) NOT NULL CHECK (carry_charge >= 0),
    line_total NUMERIC(14, 2) NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- 7. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    order_id UUID REFERENCES public.orders(id),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    currency TEXT NOT NULL DEFAULT 'PKR',
    subtotal NUMERIC(14, 2) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    additional_charges NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (additional_charges >= 0),
    grand_total NUMERIC(14, 2) NOT NULL CHECK (grand_total >= 0),
    amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
    current_revision INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('UNPAID', 'PARTIAL', 'PAID', 'REVISED', 'CANCELLED')) DEFAULT 'UNPAID',
    snapshot_data JSONB NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON public.invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- 8. Invoice Revisions Table (Immutable Audit History)
CREATE TABLE IF NOT EXISTS public.invoice_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    previous_snapshot JSONB NOT NULL,
    new_snapshot JSONB NOT NULL,
    previous_total NUMERIC(14, 2) NOT NULL,
    new_total NUMERIC(14, 2) NOT NULL,
    difference NUMERIC(14, 2) NOT NULL,
    reason TEXT NOT NULL,
    revised_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_revisions_invoice ON public.invoice_revisions(invoice_id);

-- 9. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number TEXT UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    invoice_id UUID REFERENCES public.invoices(id),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'ONLINE', 'OTHER')),
    reference_number TEXT,
    notes TEXT,
    idempotency_key TEXT UNIQUE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);

-- 10. Customer Transactions Table (The Authoritative Account Ledger)
CREATE TABLE IF NOT EXISTS public.customer_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('INVOICE', 'PAYMENT', 'ADJUSTMENT', 'REFUND', 'OPENING_BALANCE')),
    reference_id UUID,
    reference_code TEXT,
    description TEXT NOT NULL,
    debit NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (debit >= 0),
    credit NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (credit >= 0),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_debit_or_credit CHECK (debit > 0 OR credit > 0 OR (debit = 0 AND credit = 0))
);

CREATE INDEX IF NOT EXISTS idx_ledger_customer ON public.customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON public.customer_transactions(transaction_date);

-- 11. Business Settings Table
CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL DEFAULT 'Saudi Carry Charges Services',
    phone TEXT DEFAULT '+92 300 0000000',
    email TEXT DEFAULT 'info@carrycharges.com',
    address TEXT DEFAULT 'Lahore, Pakistan',
    logo_url TEXT,
    currency TEXT NOT NULL DEFAULT 'PKR',
    invoice_footer_note TEXT DEFAULT 'Carry charges only; product purchase/selling prices are not included.',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    actor_id UUID REFERENCES public.profiles(id),
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles: Authenticated users can view; users can edit own profile
CREATE POLICY "Profiles readable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Profiles updatable by self"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Customers: Accessible to authenticated users; write restricted to OWNER & STAFF
CREATE POLICY "Customers readable by authenticated users"
ON public.customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Customers insertable by OWNER and STAFF"
ON public.customers FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('OWNER', 'STAFF'));

CREATE POLICY "Customers updatable by OWNER and STAFF"
ON public.customers FOR UPDATE TO authenticated
USING (public.current_user_role() IN ('OWNER', 'STAFF'));

-- Products:
CREATE POLICY "Products readable by authenticated users"
ON public.products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Products insertable by OWNER and STAFF"
ON public.products FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('OWNER', 'STAFF'));

CREATE POLICY "Products updatable by OWNER and STAFF"
ON public.products FOR UPDATE TO authenticated
USING (public.current_user_role() IN ('OWNER', 'STAFF'));

-- Orders & Order Items:
CREATE POLICY "Orders readable by authenticated users"
ON public.orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Orders insertable by OWNER and STAFF"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('OWNER', 'STAFF'));

CREATE POLICY "Orders updatable by OWNER and STAFF"
ON public.orders FOR UPDATE TO authenticated
USING (public.current_user_role() IN ('OWNER', 'STAFF'));

CREATE POLICY "Order items readable by authenticated users"
ON public.order_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Order items insertable by OWNER and STAFF"
ON public.order_items FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('OWNER', 'STAFF'));

-- Invoices & Revisions:
CREATE POLICY "Invoices readable by authenticated users"
ON public.invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Invoices insertable by OWNER and STAFF"
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('OWNER', 'STAFF'));

CREATE POLICY "Invoices updatable by OWNER and STAFF"
ON public.invoices FOR UPDATE TO authenticated
USING (public.current_user_role() IN ('OWNER', 'STAFF'));

CREATE POLICY "Invoice revisions readable by authenticated users"
ON public.invoice_revisions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Invoice revisions insertable by OWNER and STAFF"
ON public.invoice_revisions FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('OWNER', 'STAFF'));

-- Payments:
CREATE POLICY "Payments readable by authenticated users"
ON public.payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Payments insertable by OWNER and STAFF"
ON public.payments FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('OWNER', 'STAFF'));

-- Customer Transactions (Ledger):
CREATE POLICY "Ledger readable by authenticated users"
ON public.customer_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Ledger insertable by OWNER and STAFF"
ON public.customer_transactions FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('OWNER', 'STAFF'));

-- Business Settings:
CREATE POLICY "Settings readable by authenticated users"
ON public.business_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Settings updatable by OWNER only"
ON public.business_settings FOR UPDATE TO authenticated
USING (public.current_user_role() = 'OWNER');

-- Audit Logs: Append-only for all, readable by OWNER
CREATE POLICY "Audit logs insertable by authenticated users"
ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Audit logs readable by OWNER only"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.current_user_role() = 'OWNER');

