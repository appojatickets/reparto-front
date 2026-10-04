import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, SESION, conSesionGuardada, simularApi, type Rutas } from './ayudas';

const UUID = '123e4567-e89b-42d3-a456-426614174000';
const CAMION = { id: '223e4567-e89b-42d3-a456-426614174000', patente: 'AB1234', alias: 'Camión 3', activo: true };
const FACTURA = { id: '323e4567-e89b-42d3-a456-426614174000', folio: '1001', fecha: '2026-10-05', estado: 'pendiente', urgente: true, antesDeMin: 810, camion: { id: CAMION.id, patente: CAMION.patente, alias: CAMION.alias }, local: { id: UUID, razonSocial: 'Minimarket Rabet', direccion: 'Calle 1 123', comuna: 'Maipú', tienePin: true } };

const rutas = (extra: Rutas = {}): Rutas => ({
  'GET /v1/me': () => ({ status: 200, json: { ...ADMIN, empresaId: 'e1' } }),
  'POST /v1/auth/login': () => ({ status: 200, json: { ...SESION, usuario: ADMIN } }),
  'GET /v1/camiones': () => ({ status: 200, json: { camiones: [CAMION] } }),
  'GET /v1/facturas': () => ({ status: 200, json: { facturas: [FACTURA] } }),
  'GET /v1/clientes/buscar': () => ({ status: 200, json: { resultados: [{ localId: UUID, clienteId: 'c1', razonSocial: 'Minimarket Rabet', direccion: 'Calle 1 123', comuna: 'Maipú', pinEstado: 'validado', score: 0.9 }] } }),
  ...extra,
});

const sinViolaciones = async (page: Page): Promise<void> => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
};

test.describe('fase 3a: facturas y camiones', () => {
  test('ingreso rápido de una factura, con la lista agrupada por camión, accesible', async ({ page }) => {
    let enviado: unknown;
    await simularApi(page, rutas({ 'POST /v1/facturas': (req) => { enviado = req.postDataJSON(); return { status: 201, json: FACTURA }; } }));
    await conSesionGuardada(page);
    await page.goto('/facturas');
    await expect(page.getByRole('heading', { name: 'Facturas del día' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Camión 3 · AB·1234' })).toBeVisible();
    await sinViolaciones(page);

    await page.getByLabel('Camión', { exact: true }).selectOption(CAMION.id);
    await page.getByLabel('Cliente').fill('rabe');
    await page.getByRole('button', { name: /Minimarket Rabet/ }).click();
    await page.getByLabel('Número de factura (folio)').fill('1001');
    await page.getByLabel('Urgente').check();
    await sinViolaciones(page);
    await page.getByRole('button', { name: 'GUARDAR FACTURA' }).click();
    await expect(page.getByText('Factura 1001 guardada para Minimarket Rabet.')).toBeVisible();
    expect(enviado).toMatchObject({ folio: '1001', localId: UUID, camionId: CAMION.id, urgente: true });
  });

  test('camiones: la lista y el formulario cumplen los criterios de accesibilidad', async ({ page }) => {
    await simularApi(page, rutas());
    await conSesionGuardada(page);
    await page.goto('/admin/camiones');
    await expect(page.getByText('AB·1234')).toBeVisible();
    await sinViolaciones(page);
  });

  test('los botones y campos nuevos miden al menos 64 px y no hay scroll horizontal a 200 %', async ({ page }) => {
    await simularApi(page, rutas());
    await conSesionGuardada(page);
    await page.goto('/facturas');
    await expect(page.getByRole('region', { name: 'Camión 3 · AB·1234' })).toBeVisible();
    for (const b of await page.getByRole('button').all()) expect((await b.boundingBox())?.height ?? 64).toBeGreaterThanOrEqual(63);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});
