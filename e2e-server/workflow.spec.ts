import { test, expect } from '@playwright/test';

test('server-backed sign-in, catalog, invoice, reload, payment and sign-out', async ({ page, request }) => {
 test.setTimeout(90_000);
 expect((await request.get('/api/state')).status()).toBe(401);
 expect((await request.post('/api/mutate', { data: {} })).status()).toBe(401);
 await page.goto('/');
 await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
 await page.getByLabel('Email', { exact: true }).fill('qa@example.com');
 await page.getByLabel('Password', { exact: true }).fill('wrong-password');
 await page.getByRole('button', { name: 'Sign in', exact: true }).click();
 await expect(page.getByRole('alert')).toContainText('Sign-in failed');
 await page.getByLabel('Password', { exact: true }).fill('qa-test-password');
 await page.getByRole('button', { name: 'Sign in', exact: true }).click();
 await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
 await expect(page.getByText('Demo mode:', { exact: true })).toHaveCount(0);
 await expect(page.getByLabel('Simulated role')).toHaveCount(0);
 await page.getByRole('link', { name: 'Customers', exact: true }).click();
 await page.getByRole('button', { name: /Add.*Customer|New Customer/ }).click();
 await page.getByLabel('Customer Full Name', { exact: false }).fill('Server QA Customer');
 await page.getByRole('dialog').getByRole('button', { name: /Save|Create|Add to Catalog/ }).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('link', { name: 'Catalog', exact: true }).click();
 await page.getByRole('button', { name: /Add.*Product|New Product/ }).click();
 await page.getByLabel('Product Name', { exact: false }).fill('Server QA Cargo');
 await page.getByRole('dialog').locator('input[type="number"]').fill('100');
 await page.getByRole('dialog').getByRole('button', { name: /Save|Create|Add to Catalog/ }).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('link', { name: 'New order', exact: true }).click();
 await page.getByRole('button', { name: 'Add from Catalog' }).click();
 await page.getByRole('button', { name: /Server QA Cargo/ }).click();
 await page.getByRole('button', { name: /Confirm Order/ }).click();
 await expect(page).toHaveURL(/invoices\/inv-/);
 await page.reload();
 await expect(page.locator('main')).toContainText('Server QA Cargo');
 await page.getByRole('link', { name: 'Payments', exact: true }).click();
 await page.getByRole('button', { name: 'Record New Payment' }).click();
 await page.getByLabel(/Apply to Specific Invoice/).selectOption({ index: 1 });
 await page.getByLabel(/Payment Amount/).fill('100');
 await page.getByRole('dialog').getByRole('button', { name: /Save|Record Payment|Confirm/ }).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.reload();
 await expect(page.locator('main table')).toContainText('100.00');
 await page.getByRole('button', { name: 'Sign out' }).click();
 await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
 await expect(page.locator('body')).not.toContainText('Server QA Customer');
});

test('API enforces current database roles and disabled-account status', async ({ request }) => {
  const { Pool } = await import('pg');
  const { randomUUID } = await import('node:crypto');
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const id = '00000000-0000-0000-0000-000000000001';
  const signedIn = await request.post('http://127.0.0.1:55440/auth/v1/token', { data: { email: 'qa@example.com', password: 'qa-test-password' } });
  const headers = { Authorization: `Bearer ${(await signedIn.json()).access_token}` };
  try {
    await pool.query("UPDATE public.profiles SET role='STAFF' WHERE id=$1", [id]);
    expect((await request.get('/api/state', { headers })).status()).toBe(200);
    const denied = await request.post('/api/mutate', { headers, data: { operation: 'cancelInvoice', args: ['missing','QA'], revision: 0, requestId: randomUUID() } });
    expect(denied.status()).toBe(403);
    await pool.query("UPDATE public.profiles SET role='VIEWER' WHERE id=$1", [id]);
    expect((await request.post('/api/mutate', { headers, data: { operation: 'archiveCustomer', args: ['missing'], revision: 0, requestId: randomUUID() } })).status()).toBe(403);
    await pool.query('UPDATE public.profiles SET is_active=false WHERE id=$1', [id]);
    expect((await request.get('/api/state', { headers })).status()).toBe(403);
    expect((await request.get('/api/state', { headers: { Authorization: 'Bearer invalid-token' } })).status()).toBe(401);
  } finally {
    await pool.query("UPDATE public.profiles SET role='OWNER',is_active=true WHERE id=$1", [id]);
    await pool.end();
  }
});
