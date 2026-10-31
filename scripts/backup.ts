import 'dotenv/config';
import { Pool } from 'pg';
import { writeFile } from 'node:fs/promises';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const file = process.argv[2];
if (!file) throw new Error('Usage: npm run db:backup -- /protected/path/backup.json');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const state = (await client.query('SELECT * FROM public.application_state WHERE id=1')).rows[0];
 if (!state) throw new Error('Workspace is not initialized.');
 const requests = (await client.query('SELECT * FROM public.application_requests ORDER BY created_at')).rows;
 const migrations = (await client.query('SELECT name, checksum FROM public.schema_migrations ORDER BY name')).rows;
 await writeFile(file, JSON.stringify({ format: 1, exportedAt: new Date().toISOString(), state, requests, migrations }), { flag: 'wx', mode: 0o600 });
 await client.query('COMMIT'); console.log('Backup saved. Keep it encrypted and access restricted.');
} finally { client.release(); await pool.end(); }
