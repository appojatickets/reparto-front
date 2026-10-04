import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, SESION, conSesionGuardada, simularApi, type Rutas } from './ayudas';

const rutas = (): Rutas => ({
  'GET /v1/me': () => ({ status: 200, json: { ...ADMIN, empresaId: 'e1' } }),
  'POST /v1/auth/login': () => ({ status: 200, json: { ...SESION, usuario: ADMIN } }),
  'GET /v1/camiones': () => ({ status: 200, json: { camiones: [{ id: '223e4567-e89b-42d3-a456-426614174000', patente: 'AB1234', alias: '23 nuevo', activo: true }] } }),
});

const sinViolaciones = async (page: Page): Promise<void> => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
};

test.describe('vista grande o normal', () => {
  test('la primera vez pregunta; la elección se recuerda al recargar', async ({ page }) => {
    await simularApi(page, rutas());
    await page.addInitScript(() => { if (!sessionStorage.getItem('prueba-vista')) { sessionStorage.setItem('prueba-vista', '1'); localStorage.removeItem('reparto.vista.v1'); } });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '¿Cómo quieres ver la app?' })).toBeVisible();
    await sinViolaciones(page);
    await page.getByRole('button', { name: 'NORMAL' }).click();
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.dataset['vista'])).toBe('normal');
  });

  test('en vista normal la letra es de 16 px, los botones miden al menos 44 px y sigue pasando accesibilidad', async ({ page }) => {
    await simularApi(page, rutas());
    await page.addInitScript(() => { localStorage.setItem('reparto.vista.v1', 'normal'); });
    await conSesionGuardada(page);
    await page.goto('/admin/camiones');
    await expect(page.getByText('AB·1234')).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).fontSize)).toBe('16px');
    for (const b of await page.getByRole('button').all()) expect((await b.boundingBox())?.height ?? 44).toBeGreaterThanOrEqual(43);
    await sinViolaciones(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('el botón VISTA cambia entre grande y normal y el tamaño cambia en el acto', async ({ page }) => {
    await simularApi(page, rutas());
    await conSesionGuardada(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Hola, Matías' })).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).fontSize)).toBe('28px');
    await page.getByRole('button', { name: /Cambiar a normal/ }).click();
    expect(await page.evaluate(() => getComputedStyle(document.body).fontSize)).toBe('16px');
    await page.getByRole('button', { name: /Cambiar a grande/ }).click();
    expect(await page.evaluate(() => getComputedStyle(document.body).fontSize)).toBe('28px');
  });
});
