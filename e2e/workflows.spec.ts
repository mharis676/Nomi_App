import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('all primary pages render without browser errors or page overflow', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of ['/', '/orders/new', '/invoices', '/customers', '/products', '/payments', '/settings']) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('main .container-fluid')).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  expect(errors).toEqual([]);
});

test('navigation works on desktop and mobile', async ({ page, isMobile }) => {
  await page.goto('/');
  if (isMobile) await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.getByRole('link', { name: 'Customers', exact: true }).click();
  await expect(page).toHaveURL(/customers$/);
  if (isMobile) await expect(page.getByRole('button', { name: 'Toggle navigation' })).toHaveAttribute('aria-expanded', 'false');
});

test('invalid order discount stays recoverable instead of crashing', async ({ page }) => {
  await page.goto('/orders/new');
  const discount = page.locator('input[type="number"]').filter({ visible: true });
  // Before any items, the first amount input is the order discount.
  await discount.first().fill('999999');
  await expect(page.getByRole('alert')).toContainText('Discount cannot exceed');
  await discount.first().fill('0');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('catalog item can be invoiced and persists after reload', async ({ page }) => {
  await page.goto('/orders/new');
  await page.getByRole('button', { name: 'Add from Catalog' }).click();
  await page.getByRole('button', { name: /Ajwa Al-Madinah/ }).click();
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByRole('button', { name: /Confirm/ }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  await expect(page).toHaveURL(/invoices\/inv-/);
  await page.reload();
  await expect(page.locator('main')).toContainText('Ajwa Al-Madinah');
});

test('payment modal supports keyboard dismissal, focus restoration, and persisted receipts', async ({ page }) => {
  await page.goto('/payments');
  const open = page.getByRole('button', { name: 'Record New Payment' });
  await open.click();
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(open).toBeFocused();
  await open.click();
  await page.getByLabel(/Payment Amount/).fill('123.45');
  await modal.getByRole('button', { name: /Save|Record Payment|Confirm/ }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('main table')).toContainText('123.45');
  await page.reload();
  await expect(page.locator('main table')).toContainText('123.45');
});

test('viewer mode hides editing actions', async ({ page, isMobile }) => {
  await page.goto('/');
  if (isMobile) await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.getByLabel('Simulated role').selectOption('VIEWER');
  await page.goto('/payments');
  await expect(page.getByRole('button', { name: 'Record New Payment' })).toHaveCount(0);
});
