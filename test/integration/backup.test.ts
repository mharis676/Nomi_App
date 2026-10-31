import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Pool } from 'pg';
import { it, expect } from 'vitest';
import { StorageService } from '../../src/services/ledger';
import { mutate, readState } from '../../server/operations';

it('backup and restore preserve state and request retry history', async () => {
 const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
 const folder = await mkdtemp(path.join(tmpdir(), 'carry-qa-'));
 const file = path.join(folder, 'snapshot.backup.json');
 const actor = { id: '00000000-0000-0000-0000-000000000001', fullName: 'Test owner', role: 'OWNER' as const, createdAt: new Date().toISOString() };
 const run = (script: string, args: string[]) => {
   const result = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', `scripts/${script}.ts`, ...args], { env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL }, encoding: 'utf8' });
   expect(result.status, result.stderr).toBe(0);
 };
 try {
  await pool.query('DELETE FROM public.application_requests');
  await pool.query('UPDATE public.application_state SET state=$1::jsonb,revision=0 WHERE id=1', [JSON.stringify(StorageService.emptyState())]);
  const requestId = randomUUID();
  const input = { operation: 'saveCustomer' as const, args: [{ fullName: 'Backup customer', customerCode: 'BACKUP', openingBalance: 0, isActive: true }], revision: 0, requestId };
  const first = await mutate(pool, actor, input);
  run('backup', [file]);
  await pool.query('UPDATE public.application_state SET state=$1::jsonb WHERE id=1', [JSON.stringify(StorageService.emptyState())]);
  run('restore', [file, '--confirm-replace']);
  expect((await readState(pool, actor)).state).toEqual(first.state);
  const retry = await mutate(pool, actor, input);
  expect(retry.result).toEqual(first.result);
  expect(new StorageService(retry.state).getCustomers()).toHaveLength(1);
 } finally { await pool.end(); if (path.dirname(folder) === path.resolve(tmpdir()) && path.basename(folder).startsWith('carry-qa-')) await rm(folder, { recursive: true, force: true }); }
}, 20_000);
