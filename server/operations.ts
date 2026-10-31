import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { StorageService } from '../src/services/ledger.js';
import { validateArgs, type Operation } from './validation.js';
import type { UserProfile } from '../src/types/index.js';

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
const ownerOnly = new Set(['cancelInvoice', 'recordRefund', 'updateBusinessSettings']);
export function publicState(state: Record<string, unknown>, role: string) {
  return role === 'OWNER' ? state : { ...state, saudi_carry_audit: [] };
}
export async function readState(pool: Pool, actor: UserProfile) {
  const result = await pool.query('SELECT state, revision FROM public.application_state WHERE id=1');
  if (!result.rows.length) throw new ApiError(503, 'Workspace is not initialized.');
  return { state: publicState(result.rows[0].state, actor.role), revision: Number(result.rows[0].revision) };
}
export async function mutate(pool: Pool, actor: UserProfile, input: { operation: Operation; args: unknown[]; requestId: string; revision: number }) {
  if (actor.role === 'VIEWER' || (ownerOnly.has(input.operation) && actor.role !== 'OWNER')) throw new ApiError(403, 'Your role cannot perform this action.');
  const args = validateArgs(input.operation, input.args);
  const fingerprint = createHash('sha256').update(JSON.stringify([input.operation, args])).digest('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = (await client.query('SELECT state, revision FROM public.application_state WHERE id=1 FOR UPDATE')).rows[0];
    if (!current) throw new ApiError(503, 'Workspace is not initialized.');
    // The workspace lock serializes requests across server instances, including retries.
    const previous = (await client.query('SELECT * FROM public.application_requests WHERE request_id=$1', [input.requestId])).rows[0];
    if (previous) {
      if (previous.actor_id !== actor.id || previous.fingerprint !== fingerprint) throw new ApiError(409, 'Request key was already used with different details.');
      await client.query('COMMIT');
      return { result: previous.result, state: publicState(current.state, actor.role), revision: Number(current.revision) };
    }
    if (Number(current.revision) !== input.revision) throw new ApiError(409, 'Workspace changed. Latest records have been loaded; review and submit again.');
    const ledger = new StorageService(current.state, actor.id);
    const result = (ledger[input.operation] as (...values: any[]) => unknown).apply(ledger, args);
    const state = ledger.exportState();
    const revision = Number(current.revision) + 1;
    await client.query('UPDATE public.application_state SET state=$1::jsonb, revision=$2, updated_at=now() WHERE id=1', [JSON.stringify(state), revision]);
    await client.query('INSERT INTO public.application_requests(request_id, actor_id, fingerprint, result) VALUES ($1,$2,$3,$4::jsonb)', [input.requestId, actor.id, fingerprint, JSON.stringify(result)]);
    await client.query('COMMIT');
    return { result, state: publicState(state, actor.role), revision };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
