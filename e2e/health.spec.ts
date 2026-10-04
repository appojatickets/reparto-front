import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const cors = { 'access-control-allow-origin': '*' };
const ok = { status: 'ok', database: 'ok', timestamp: '2026-10-05T12:00:00.000Z' };

const mockHealth = async (page: Page, delayMs: number) => {
  await page.route('http://api.test/v1/health', async (route) => {
    await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({ status: 200, headers: cors, json: ok });
  });
};

test('llama a /health y muestra «Servidor listo»', async ({ page }) => {
  await mockHealth(page, 0);
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Servidor listo');
});

test('muestra «despertando servidor» si tarda más de 3 s', async ({ page }) => {
  await mockHealth(page, 4500);
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('Despertando servidor', { timeout: 6000 });
  await expect(page.getByRole('status')).toHaveText('Servidor listo', { timeout: 6000 });
});

test('sin conexión ofrece REINTENTAR con objetivo táctil >= 64 px', async ({ page }) => {
  await page.route('http://api.test/v1/health', (route) => route.abort('connectionrefused'));
  await page.goto('/');
  const retry = page.getByRole('button', { name: 'REINTENTAR' });
  await expect(retry).toBeVisible();
  const box = await retry.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(64);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(64);
});

test('letra base >= 28 px y sin violaciones de axe (WCAG AAA de contraste)', async ({ page }) => {
  await mockHealth(page, 0);
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Servidor listo');
  const fontSize = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(28);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('sin scroll horizontal al 200% de escala en 360 px', async ({ page }) => {
  await mockHealth(page, 0);
  await page.setViewportSize({ width: 180, height: 370 }); // 360 px a 200 %
  await page.goto('/');
  await expect(page.getByRole('status')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
