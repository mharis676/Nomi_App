import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { StorageService } from '../../src/services/ledger';
import { mutate, readState } from '../../server/operations';
import type { UserProfile } from '../../src/types';

if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL must point to an isolated, migrated test database.');
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const owner: UserProfile = { id: '00000000-0000-0000-0000-000000000001', fullName: 'Test owner', role: 'OWNER', createdAt: new Date().toISOString() };
const staff = { ...owner, role: 'STAFF' as const };
const viewer = { ...owner, role: 'VIEWER' as const };
const call = async (operation: Parameters<typeof mutate>[2]['operation'], args: unknown[], actor = owner) => mutate(pool, actor, { operation, args, revision: (await readState(pool, owner)).revision, requestId: randomUUID() });
const customerData = { fullName: 'Customer', customerCode: 'QA-001', openingBalance: 0, isActive: true };
const productData = { name: 'Cargo', defaultCarryCharge: 100, chargeMethod: 'PER_UNIT', currency: 'PKR', isActive: true };
const order = async () => {
 const customer = (await call('saveCustomer', [customerData])).result as any;
 const product = (await call('saveProduct', [productData])).result as any;
 return { customer, product, payload: { customerId: customer.id, items: [{ id: 'line-1', productId: product.id, productNameSnapshot: product.name, quantity: 2, chargeMethod: 'PER_UNIT', carryCharge: 100, lineTotal: 1 }] } };
};
beforeAll(async () => {
 await pool.query('INSERT INTO auth.users(id) VALUES ($1) ON CONFLICT DO NOTHING', [owner.id]);
 await pool.query("INSERT INTO public.profiles(id,full_name,role) VALUES ($1,'Test owner','OWNER') ON CONFLICT DO NOTHING", [owner.id]);
});
beforeEach(async () => {
 await pool.query('DELETE FROM public.application_requests');
 await pool.query('UPDATE public.application_state SET state=$1::jsonb, revision=0 WHERE id=1', [JSON.stringify(StorageService.emptyState())]);
});
afterAll(() => pool.end());
describe('PostgreSQL transaction boundary', () => {
 it('blocks viewer writes and staff-only escalation to owner actions', async () => {
   await expect(call('saveCustomer', [customerData], viewer)).rejects.toMatchObject({ status: 403 });
   await expect(call('cancelInvoice', ['missing','reason'], staff)).rejects.toMatchObject({ status: 403 });
   expect((await readState(pool, owner)).revision).toBe(0);
 });
 it('recalculates client totals, commits invoice/ledger/audit together and settles payments', async () => {
   const { customer, payload } = await order();
   const confirmation = await call('confirmOrder', [payload]);
   const invoice = (confirmation.result as any).invoice;
   expect(invoice.grandTotal).toBe(200);
   await call('recordPayment', [{ customerId: customer.id, invoiceId: invoice.id, amount: 200, paymentMethod: 'CASH' }]);
   const ledger = new StorageService((await readState(pool, owner)).state);
   expect(ledger.getInvoice(invoice.id)?.status).toBe('PAID');
   expect(ledger.getCustomerStatement(customer.id).closingBalance).toBe(0);
   expect(ledger.getAuditLogs().every(log => log.actorId === owner.id)).toBe(true);
 });
 it('replays an identical request once and rejects changed retry payloads', async () => {
   const { payload } = await order();
   const input = { operation: 'confirmOrder' as const, args: [payload], revision: 2, requestId: randomUUID() };
   const first = await mutate(pool, owner, input);
   const second = await mutate(pool, owner, input);
   expect(first.result).toEqual(second.result);
   expect(second.revision).toBe(3);
   expect(new StorageService(second.state).getInvoices()).toHaveLength(1);
   await expect(mutate(pool, owner, { ...input, args: [{ ...payload, notes: 'Changed' }] })).rejects.toMatchObject({ status: 409 });
 });
 it('serializes concurrent writes and reports stale state without losing data', async () => {
   const results = await Promise.allSettled([1,2].map(n => mutate(pool, owner, { operation: 'saveCustomer', args: [{ ...customerData, customerCode: `QA-${n}` }], revision: 0, requestId: randomUUID() })));
   expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
   expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
   expect(new StorageService((await readState(pool, owner)).state).getCustomers()).toHaveLength(1);
 });
 it('rolls back when database persistence fails after domain operations', async () => {
   const { payload } = await order();
   const before = await readState(pool, owner);
   // Missing actor violates the requests foreign key after state UPDATE has executed.
   await expect(mutate(pool, { ...owner, id: randomUUID() }, { operation: 'confirmOrder', args: [payload], revision: before.revision, requestId: randomUUID() })).rejects.toBeDefined();
   expect(await readState(pool, owner)).toEqual(before);
 });
 it('redacts audit data from staff and viewer state', async () => {
   await call('saveCustomer', [customerData]);
   expect((await readState(pool, viewer)).state.saudi_carry_audit).toEqual([]);
   expect((await readState(pool, owner)).state.saudi_carry_audit).not.toEqual([]);
 });
 it('rejects invalid fields and opening-balance rewrites', async () => {
   await expect(call('recordPayment', [{ customerId: 'missing', amount: Infinity, paymentMethod: 'CASH' }])).rejects.toBeDefined();
   const customer = (await call('saveCustomer', [customerData])).result as any;
   await expect(call('saveCustomer', [{ ...customer, openingBalance: 100 }])).rejects.toThrow(/cannot be changed/);
 });
 it('denies direct browser-role reads/writes to financial and state tables', async () => {
   const result = await pool.query("SELECT has_table_privilege('authenticated','public.application_state','UPDATE') AS state_write, has_table_privilege('authenticated','public.invoices','INSERT') AS invoice_write, has_table_privilege('anon','public.application_state','SELECT') AS state_read");
   expect(result.rows[0]).toEqual({ state_write: false, invoice_write: false, state_read: false });
 });
});

it('the restricted runtime database role can commit through the server boundary', async () => {
  const runtime = new Pool({ connectionString: process.env.TEST_DATABASE_URL, options: '-c role=carry_runtime' });
  try {
    const current = await readState(runtime, owner);
    const result = await mutate(runtime, owner, { operation: 'saveCustomer', args: [{ ...customerData, customerCode: 'RUNTIME' }], requestId: randomUUID(), revision: current.revision });
    expect((result.result as any).customerCode).toBe('RUNTIME');
    await expect(runtime.query('DELETE FROM public.application_state')).rejects.toMatchObject({ code: '42501' });
    await expect(runtime.query("UPDATE public.profiles SET role='OWNER' WHERE id=$1", [owner.id])).rejects.toMatchObject({ code: '42501' });
  } finally { await runtime.end(); }
});
