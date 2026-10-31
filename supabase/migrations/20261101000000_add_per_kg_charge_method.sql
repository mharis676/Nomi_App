-- Migration: 20261101000000_add_per_kg_charge_method.sql
-- Add PER_KG to charge_method check constraints on products and order_items

ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_charge_method_check;

ALTER TABLE public.products
ADD CONSTRAINT products_charge_method_check
CHECK (charge_method IN ('PER_UNIT', 'PER_ORDER', 'PER_KG'));

ALTER TABLE public.order_items
DROP CONSTRAINT IF EXISTS order_items_charge_method_check;

ALTER TABLE public.order_items
ADD CONSTRAINT order_items_charge_method_check
CHECK (charge_method IN ('PER_UNIT', 'PER_ORDER', 'PER_KG'));

-- Add optional weight_kg column if not already present
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(12, 3);

