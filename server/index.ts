import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { ZodError } from 'zod';
import { ApiError, mutate, readState } from './operations.js';
import { envelope } from './validation.js';
import type { UserProfile } from '../src/types/index.js';

const { DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, APP_ORIGIN } = process.env;
if (!DATABASE_URL || !SUPABASE_URL || !SUPABASE_ANON_KEY || !APP_ORIGIN) throw new Error('DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY and APP_ORIGIN are required.');
const origin = new URL(APP_ORIGIN).origin;
if (process.env.NODE_ENV === 'production' && new URL(origin).protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Production APP_ORIGIN must use HTTPS.');
const buildConfig = JSON.parse(readFileSync(new URL('../dist/build-config.json', import.meta.url), 'utf8'));
if (buildConfig.dataMode !== 'server' || buildConfig.supabaseUrl !== SUPABASE_URL) throw new Error('Build must use server mode and the same Supabase URL as the application server.');
const pool = new Pool({ connectionString: DATABASE_URL, max: 10, connectionTimeoutMillis: 10_000, statement_timeout: 15_000 });
const auth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }) } });
const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY_HOPS) app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], connectSrc: ["'self'", new URL(SUPABASE_URL).origin], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:', 'blob:'], fontSrc: ["'self'", 'data:'], objectSrc: ["'none'"], frameAncestors: ["'none'"] } } }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use(express.json({ limit: '512kb' }));
app.get('/healthz', async (_req, res) => { try { const result = await pool.query('SELECT revision FROM public.application_state WHERE id=1'); if (!result.rows.length) throw new Error('Not initialized'); res.json({ status: 'ok' }); } catch { res.status(503).json({ status: 'unavailable' }); } });
app.use('/api', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'GET' && req.headers.origin && req.headers.origin !== origin) throw new ApiError(403, 'Request origin is not allowed.');
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new ApiError(401, 'Sign in is required.');
    const { data, error } = await auth.auth.getUser(token);
    if (error && (!error.status || error.status >= 500)) throw new ApiError(503, 'Sign-in service is temporarily unavailable. Retry shortly.');
    if (error || !data.user) throw new ApiError(401, 'Your session has expired. Sign in again.');
    const profile = (await pool.query('SELECT id, full_name, role, created_at FROM public.profiles WHERE id=$1 AND is_active=true', [data.user.id])).rows[0];
    if (!profile) throw new ApiError(403, 'Your account has not been granted workspace access. Contact your administrator.');
    res.locals.actor = { id: profile.id, fullName: profile.full_name, role: profile.role, createdAt: profile.created_at } satisfies UserProfile;
    next();
  } catch (error) { next(error); }
});
app.get('/api/me', (_req, res) => res.json(res.locals.actor));
app.get('/api/state', async (_req, res, next) => { try { res.json(await readState(pool, res.locals.actor)); } catch (error) { next(error); } });
app.post('/api/mutate', async (req, res, next) => {
  try { res.json(await mutate(pool, res.locals.actor, envelope.parse(req.body))); } catch (error) { next(error); }
});
app.use('/api', (_req, res) => { res.status(404).json({ error: 'Endpoint not found.' }); });
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
app.use(express.static(dist, { index: false, maxAge: '1h', setHeaders: (res, file) => { if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); } }));
app.get('/{*path}', (_req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(dist, 'index.html')); });
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = error instanceof ApiError ? error.status : error instanceof ZodError ? 400 : (error as { status?: number })?.status === 413 ? 413 : 400;
  // Domain validation errors are useful; database/internal details must remain server-side.
  const internal = !!(error as { code?: string })?.code;
  if (internal) console.error('Database request failed', { code: (error as { code: string }).code });
  res.status(internal ? 503 : status).json({ error: internal ? 'Workspace is temporarily unavailable. Retry shortly.' : error instanceof ZodError ? 'Check the submitted fields and amounts.' : error instanceof Error ? error.message : 'Request failed.' });
});
const server = app.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Application server is ready.'));
const shutdown = () => { server.close(() => { void pool.end().then(() => process.exit(0)); }); setTimeout(() => process.exit(1), 10_000).unref(); };
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
