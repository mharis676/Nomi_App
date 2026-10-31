import 'dotenv/config';
import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const file = process.argv[2];
if (!file || process.argv[3] !== '--confirm-replace') throw new Error('Stop the application server. Usage: npm run db:restore -- backup.json --confirm-replace');
const data = JSON.parse(await readFile(file, 'utf8'));
if (data.format !== 1 || data.state?.id !== 1 || !data.state.state || !Array.isArray(data.requests)) throw new Error('Invalid backup format.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
 await client.query('BEGIN');
 const migrations = (await client.query('SELECT name,checksum FROM public.schema_migrations ORDER BY name')).rows;
 if (JSON.stringify(migrations) !== JSON.stringify(data.migrations)) throw new Error('Backup schema does not match this database.');
 await client.query('SELECT id FROM public.application_state WHERE id=1 FOR UPDATE');
 await client.query('DELETE FROM public.application_requests');
 for (const request of data.requests) await client.query('INSERT INTO public.application_requests(request_id,actor_id,fingerprint,result,created_at) VALUES ($1,$2,$3,$4::jsonb,$5)', [request.request_id,request.actor_id,request.fingerprint,JSON.stringify(request.result),request.created_at]);
 await client.query('UPDATE public.application_state SET state=$1::jsonb, revision=revision+1, updated_at=now() WHERE id=1', [JSON.stringify(data.state.state)]);
 await client.query('COMMIT'); console.log('Workspace restored. Verify balances before restarting the server.');
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await pool.end(); }
