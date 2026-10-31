// LOCAL TEST IDENTITY SERVICE ONLY. This file is never used by the application server.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { Pool } from 'pg';
import { StorageService } from '../../src/services/ledger';
const database = process.env.TEST_DATABASE_URL;
if (!database) throw new Error('TEST_DATABASE_URL is required. Use an isolated test database.');
const id = '00000000-0000-0000-0000-000000000001';
const pool = new Pool({ connectionString: database });
await pool.query('INSERT INTO auth.users(id) VALUES ($1) ON CONFLICT DO NOTHING', [id]);
await pool.query("INSERT INTO public.profiles(id,full_name,role) VALUES ($1,'QA Owner','OWNER') ON CONFLICT (id) DO UPDATE SET role='OWNER'", [id]);
await pool.query('DELETE FROM public.application_requests');
await pool.query('UPDATE public.application_state SET state=$1::jsonb,revision=0 WHERE id=1', [JSON.stringify(StorageService.emptyState())]);
await pool.end();
const user = { id, aud: 'authenticated', role: 'authenticated', email: 'qa@example.com', email_confirmed_at: new Date().toISOString(), created_at: new Date().toISOString(), app_metadata: {}, user_metadata: {} };
const token = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now()/1000)+3600, aud: 'authenticated' })).toString('base64url'), 'test-only-signature'].join('.');
const identity = createServer(async (req, res) => {
 res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:3001');
 res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,content-type,x-client-info,x-supabase-api-version');
 res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
 res.setHeader('Content-Type', 'application/json');
 if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
 if (req.url?.startsWith('/auth/v1/token')) {
   let raw=''; for await (const chunk of req) raw+=chunk;
   const body = JSON.parse(raw);
   if (body.email !== 'qa@example.com' || body.password !== 'qa-test-password') { res.writeHead(400).end(JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid credentials' })); return; }
   res.end(JSON.stringify({ access_token: token, refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, user })); return;
 }
 if (req.url === '/auth/v1/user' && req.headers.authorization === `Bearer ${token}`) { res.end(JSON.stringify(user)); return; }
 if (req.url?.startsWith('/auth/v1/logout')) { res.end('{}'); return; }
 res.writeHead(401).end(JSON.stringify({ message: 'Invalid token' }));
});
identity.listen(55440, '127.0.0.1');
const runtimeDatabase = new URL(database); runtimeDatabase.searchParams.set('options', '-c role=carry_runtime');
const server = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs','server/index.ts'], { stdio: 'inherit', env: { ...process.env, DATABASE_URL: runtimeDatabase.toString(), SUPABASE_URL: 'http://127.0.0.1:55440', SUPABASE_ANON_KEY: 'test-public-key', APP_ORIGIN: 'http://127.0.0.1:3001', PORT: '3001' } });
const stop = () => { server.kill(); identity.close(); };
process.on('SIGTERM', stop); process.on('SIGINT', stop);
server.on('exit', code => { identity.close(); process.exit(code || 0); });
