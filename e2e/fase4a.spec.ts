import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { CHOFER, SESION, conSesionGuardada, simularApi, type Rutas } from './ayudas';

const UUID = '123e4567-e89b-42d3-a456-426614174000';
const CAMION = { id: '223e4567-e89b-42d3-a456-426614174000', patente: 'AB1234', alias: 'Camión 3', activo: true };
const JORNADA = { id: '323e4567-e89b-42d3-a456-426614174000', fecha: '2026-10-05', desde: '2026-10-05T11:00:00.000Z', camion: { id: CAMION.id, patente: CAMION.patente, alias: CAMION.alias } };
const FACTURA = { id: '423e4567-e89b-42d3-a456-426614174000', folio: '1234', fecha: '2026-10-05', estado: 'pendiente', urgente: true, antesDeMin: 780, camion: JORNADA.camion, local: { id: UUID, razonSocial: 'Minimarket Rabet', direccion: 'Calle 1 123', comuna: 'Maipú', tienePin: true } };

const rutas = (extra: Rutas = {}): Rutas => ({
  'GET /v1/me': () => ({ status: 200, json: { ...CHOFER, empresaId: 'e1' } }),
  'POST /v1/auth/login': () => ({ status: 200, json: { ...SESION, usuario: CHOFER } }),
  'GET /v1/camiones': () => ({ status: 200, json: { camiones: [CAMION] } }),
  'GET /v1/jornada': () => ({ status: 200, json: { jornada: JORNADA } }),
  'GET /v1/facturas': () => ({ status: 200, json: { facturas: [FACTURA] } }),
  'GET /v1/clientes/buscar': () => ({ status: 200, json: { resultados: [{ localId: UUID, clienteId: 'c1', razonSocial: 'Minimarket Rabet', direccion: 'Calle 1 123', comuna: 'Maipú', pinEstado: 'validado', score: 0.9 }] } }),
  ...extra,
});

const sinViolaciones = async (page: Page): Promise<void> => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
};

test.describe('fase 4a: el chofer', () => {
  test('elegir camión: pantalla accesible y un toque inicia la jornada', async ({ page }) => {
    let iniciada: unknown;
    await simularApi(page, rutas({ 'GET /v1/jornada': () => ({ status: 200, json: { jornada: null } }), 'POST /v1/jornada': (req) => { iniciada = req.postDataJSON(); return { status: 200, json: JORNADA }; } }));
    await conSesionGuardada(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '¿Qué camión manejas hoy?' })).toBeVisible();
    await sinViolaciones(page);
    await Promise.all([
      page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/v1/jornada')),
      page.getByRole('button', { name: 'Camión 3 · AB·1234' }).click(),
    ]);
    await expect.poll(() => iniciada).toBeDefined();
    expect(iniciada).toEqual({ camionId: CAMION.id });
  });

  test('inicio del chofer con su camión, accesible y con objetivos táctiles grandes', async ({ page }) => {
    await simularApi(page, rutas());
    await conSesionGuardada(page);
    await page.goto('/');
    await expect(page.getByText('Camión Camión 3 · AB·1234')).toBeVisible();
    await sinViolaciones(page);
    for (const b of await page.getByRole('button').all()) expect((await b.boundingBox())?.height ?? 64).toBeGreaterThanOrEqual(63);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('cargar una entrega solo con el cliente', async ({ page }) => {
    let enviado: unknown;
    await simularApi(page, rutas({ 'POST /v1/facturas': (req) => { enviado = req.postDataJSON(); return { status: 201, json: FACTURA }; } }));
    await conSesionGuardada(page);
    await page.goto('/cargar');
    await expect(page.getByRole('heading', { name: 'Cargar entregas' })).toBeVisible();
    await page.getByLabel('Dirección o cliente').fill('minimarket rabet');
    await expect(page.getByRole('button', { name: /^Minimarket Rabet.*Maipú/ })).toBeVisible();
    await sinViolaciones(page);
    await page.getByRole('button', { name: /^Minimarket Rabet.*Maipú/ }).click();
    await expect(page.getByText(/Ya cargaste a Minimarket Rabet hoy/)).toBeVisible(); // la lista simulada ya trae una entrega de ese cliente
    await page.getByRole('button', { name: 'CARGAR OTRA' }).click();
    await expect(page.getByText('Cargado: Minimarket Rabet.')).toBeVisible();
    expect(enviado).toMatchObject({ localId: UUID, camionId: CAMION.id });
    expect(enviado).not.toHaveProperty('folio');
    await expect(page.getByLabel('Dirección o cliente')).toHaveValue('');
  });

  test('la pantalla de cargar con facturas y condiciones abiertas es accesible', async ({ page }) => {
    await simularApi(page, rutas());
    await conSesionGuardada(page);
    await page.goto('/cargar');
    await page.getByRole('button', { name: 'CONDICIONES Minimarket Rabet' }).click();
    await expect(page.getByLabel('Entregar antes de (Minimarket Rabet)')).toBeVisible();
    await sinViolaciones(page);
    for (const b of await page.getByRole('button').all()) expect((await b.boundingBox())?.height ?? 64).toBeGreaterThanOrEqual(63);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('mi ruta con las acciones de la parada (navegar, llegué, entregado, cerrado) es accesible', async ({ page }) => {
    let evento: unknown;
    const parada = (n: string, pos: number) => ({ facturaId: `32${n}e4567-e89b-42d3-a456-426614174000`, localId: `42${n}e4567-e89b-42d3-a456-426614174000`, cliente: `Local ${n}`, direccion: `Calle ${n} 100`, comuna: 'San Bernardo', lat: -33.59, lng: -70.7, urgente: false, posicion: pos, llegada: 600 + pos * 20, inicioServicio: 600 + pos * 20, salida: 608 + pos * 20, espera: 0, atraso: 0, motivos: ['MENOR_DESVIO'], fijada: false });
    const vista = { camionId: CAMION.id, fecha: '2026-10-05', planificada: true, modo: 'sugerida', version: 1, salidaMin: 480, horaLimiteRegresoMin: 1260, regreso: 800, regresoTardio: false, paradas: [parada('1', 0), parada('2', 1)], nuevas: [], hechas: [], sinPin: [], noAtendidas: [], enRiesgo: [] };
    await simularApi(page, rutas({
      'GET /v1/rutas': () => ({ status: 200, json: vista }),
      [`POST /v1/entregas/${parada('1', 0).facturaId}/eventos`]: (req) => { evento = req.postDataJSON(); return { status: 200, json: { estado: 'pendiente', pinFijado: false } }; },
    }));
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: -33.5901, longitude: -70.7002, accuracy: 10 });
    await conSesionGuardada(page);
    await page.goto('/mi-ruta');
    await expect(page.getByRole('listitem', { name: 'Parada 1' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'NAVEGAR CON WAZE a Local 1' })).toBeVisible();
    await sinViolaciones(page);
    await page.getByRole('button', { name: 'ESTÁ CERRADO Local 1' }).click();
    await expect(page.getByRole('link', { name: 'AVISAR AL VENDEDOR POR WHATSAPP' })).toBeVisible();
    expect(evento).toMatchObject({ tipo: 'cerrado', lat: -33.5901, lng: -70.7002 });
    await sinViolaciones(page);
    for (const b of await page.getByRole('button').all()) expect((await b.boundingBox())?.height ?? 64).toBeGreaterThanOrEqual(63);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});
