# BACKUP AND DISASTER RECOVERY PROCEDURES

## Saudi Carry Charges & Customer Account Management System

### 1. Database Backup Strategy

Since the application uses PostgreSQL (via Supabase or standard PostgreSQL instances), backups must ensure transactional consistency across all financial and ledger tables.

#### 1.1 Automated Backups
- Supabase automatically provides Point-In-Time Recovery (PITR) and daily automated snapshots for Pro tier.
- For self-hosted or dedicated PostgreSQL instances, enable WAL archiving and configure `pg_dump` daily cron jobs.

#### 1.2 Manual Logical Backup (pg_dump)
To take a complete logical backup of all schema and financial data:
```bash
# Dump all tables, schema, functions, and RLS policies
pg_dump --host=<DB_HOST> \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        --format=custom \
        --file=backup_$(date +%Y%m%d_%H%M%S).dump
```

---

### 2. Restoration Runbook

#### 2.1 Restoration to Staging / Recovery Environment
1. Provision a clean target PostgreSQL instance.
2. Ensure database user credentials and extensions (`uuid-ossp`, `pgcrypto`) are configured.
3. Execute restore using `pg_restore`:
```bash
pg_restore --host=<RECOVERY_HOST> \
           --port=5432 \
           --username=postgres \
           --dbname=postgres \
           --clean \
           --if-exists \
           backup_20261031_000000.dump
```
4. Verify Row Level Security policies:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```
5. Run the ledger verification query to ensure financial integrity:
```sql
-- Check that customer ledger matches transaction sum
SELECT 
  c.id, 
  c.full_name,
  c.opening_balance + COALESCE(SUM(t.debit), 0) - COALESCE(SUM(t.credit), 0) AS calculated_balance
FROM customers c
LEFT JOIN customer_transactions t ON t.customer_id = c.id
GROUP BY c.id, c.full_name, c.opening_balance;
```

---

### 3. Data Retention and Archival Policy
- Customers and Products must **never be hard-deleted** if they have associated orders, invoices, or ledger transactions. They are marked `is_active = false`.
- Historical invoice revisions are retained permanently for auditing.
- Financial audit logs are append-only.

