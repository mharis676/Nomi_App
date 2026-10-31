-- Stop automatic adoption of an existing relational installation.
-- Import/reconciliation must be reviewed before the new server mode can start.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.customers) OR EXISTS (SELECT 1 FROM public.invoices)
     OR EXISTS (SELECT 1 FROM public.payments) OR EXISTS (SELECT 1 FROM public.products)
     OR EXISTS (SELECT 1 FROM public.customer_transactions) THEN
    RAISE EXCEPTION 'Existing relational data requires an explicit validated import before enabling server persistence';
  END IF;
END $$;
