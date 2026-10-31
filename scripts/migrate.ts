import 'dotenv/config';
import { Pool } from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { StorageService } from '../src/services/ledger.js';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query('SELECT pg_advisory_lock(21840731)');
  await client.query('CREATE TABLE IF NOT EXISTS public.schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  for (const name of (await readdir('supabase/migrations')).filter(name => name.endsWith('.sql')).sort()) {
    const sql = await readFile(`supabase/migrations/${name}`, 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const previous = (await client.query('SELECT checksum FROM public.schema_migrations WHERE name=$1', [name])).rows[0];
    if (previous) { if (previous.checksum !== checksum) throw new Error(`Applied migration changed: ${name}`); continue; }
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO public.schema_migrations(name,checksum) VALUES ($1,$2)', [name, checksum]);
      await client.query('COMMIT'); console.log(`Applied ${name}`);
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  }
  await client.query('INSERT INTO public.application_state(id,state) VALUES (1,$1::jsonb) ON CONFLICT (id) DO NOTHING', [JSON.stringify(StorageService.emptyState())]);
} finally { await client.query('SELECT pg_advisory_unlock(21840731)'); client.release(); await pool.end(); }
