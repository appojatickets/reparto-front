import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, SESION, conSesionGuardada, simularApi, type Rutas } from './ayudas';

const CAMION = { id: '223e4567-e89b-42d3-a456-426614174000', patente: 'AB1234', alias: 'Camión 3', activo: true };
const item = (n: string, extra: object = {}) => ({ facturaId: `32${n}e4567-e89b-42d3-a456-426614174000`, folio: `100${n}`, localId: `42${n}e4567-e89b-42d3-a456-426614174000`, cliente: `Local ${n}`, direccion: `Calle ${n} 100`, comuna: 'Maipú', urgente: false, ...extra });
const parada = (n: string, pos: number, extra: object = {}) => ({ ...item(n), posicion: pos, llegada: 540 + pos * 25, inicioServicio: 540 + pos * 25, salida: 548 + pos * 25, espera: 0, atraso: 0, motivos: ['MENOR_DESVIO'], fijada: false, ...extra });
const VISTA = {
  camionId: CAMION.id, fecha: '2026-10-05', planificada: true, modo: 'sugerida', version: 1, salidaMin: 480, horaLimiteRegresoMin: 1260, regreso: 700, regresoTardio: false,
  paradas: [parada('1', 0, { urgente: true, antesDeMin: 720, motivos: ['VENTANA_DURA'] }), parada('2', 1), parada('3', 2, { atraso: 12 })],
  nuevas: [item('4')], hechas: [], sinPin: [item('5')], noAtendidas: [{ ...item('6'), conflictos: ['Cierra a las 09:00 y no alcanza a llegar.'] }],
  enRiesgo: [{ ...item('3'), cierre: 600, conflictos: ['Llega 12 min después del cierre.'], sugerencias: [{ tipo: 'SALIR_ANTES', minutos: 15, texto: 'Salir 15 min antes (a las 07:45).' }] }],
};

const rutas = (extra: Rutas = {}): Rutas => ({
  'GET /v1/me': () => ({ status: 200, json: { ...ADMIN, empresaId: 'e1' } }),
  'POST /v1/auth/login': () => ({ status: 200, json: { ...SESION, usuario: ADMIN } }),
  'GET /v1/camiones': () => ({ status: 200, json: { camiones: [CAMION] } }),
  'GET /v1/rutas': () => ({ status: 200, json: VISTA }),
  'GET /v1/empresa/config': () => ({ status: 200, json: { salidaPorDefectoMin: 480, horaLimiteRegresoMin: 1260 } }),
  ...extra,
});

const sinViolaciones = async (page: Page): Promise<void> => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
};

test.describe('fase 3b: rutas y configuración', () => {
  test('la ruta con paradas, riesgos, nuevas, sin pin y no atendidas es accesible y se acomoda', async ({ page }) => {
    let operacion: unknown;
    await simularApi(page, rutas({ 'POST /v1/rutas/operaciones': (req) => { operacion = req.postDataJSON(); return { status: 200, json: { ...VISTA, version: 2, modo: 'manual' } }; } }));
    await conSesionGuardada(page);
    await page.goto('/rutas');
    await page.getByLabel('Camión', { exact: true }).selectOption(CAMION.id);
    await expect(page.getByRole('listitem', { name: 'Parada 1' })).toBeVisible();
    await sinViolaciones(page);
    await page.getByRole('listitem', { name: 'Parada 2', exact: true }).getByRole('button', { name: /^Local 2/ }).click();
    await page.getByRole('button', { name: 'MÁS OPCIONES Local 2' }).click();
    await sinViolaciones(page);
    await page.getByRole('button', { name: 'MOVER Local 2', exact: true }).focus();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByText('ACOMODADA A MANO')).toBeVisible();
    expect(operacion).toMatchObject({ version: 1, operacion: { tipo: 'mover', posicion: 0 } });
  });

  test('configuración del depósito accesible', async ({ page }) => {
    await simularApi(page, rutas());
    await conSesionGuardada(page);
    await page.goto('/admin/configuracion');
    await expect(page.getByText(/Falta el depósito/)).toBeVisible();
    await sinViolaciones(page);
  });

  test('sin scroll horizontal y objetivos táctiles >= 64 px en la ruta', async ({ page }) => {
    await simularApi(page, rutas());
    await conSesionGuardada(page);
    await page.goto('/rutas');
    await page.getByLabel('Camión', { exact: true }).selectOption(CAMION.id);
    await expect(page.getByRole('listitem', { name: 'Parada 1' })).toBeVisible();
    for (const b of await page.getByRole('button').all()) {
      if (await b.isDisabled()) continue;
      expect((await b.boundingBox())?.height ?? 64).toBeGreaterThanOrEqual(63);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});

test.describe('fase 3b: horario del local', () => {
  const LOCAL = { id: '123e4567-e89b-42d3-a456-426614174000', clienteId: 'c1', razonSocial: 'Rabelo Mágica SpA', direccion: 'Av. Providencia 2500', comuna: 'Providencia', lat: -33.4372, lng: -70.6506, pinEstado: 'validado' };

  test('el editor con botones es accesible, sirve con el teclado y guarda', async ({ page }) => {
    let enviado: unknown;
    await simularApi(page, rutas({
      [`GET /v1/locales/${LOCAL.id}`]: () => ({ status: 200, json: LOCAL }),
      [`GET /v1/locales/${LOCAL.id}/horario`]: () => ({ status: 200, json: { dias: [{ dia: 0, cerrado: true, tramos: [] }] } }),
      [`PUT /v1/locales/${LOCAL.id}/horario`]: (req) => { enviado = req.postDataJSON(); return { status: 200, json: req.postDataJSON() }; },
    }));
    await conSesionGuardada(page);
    await page.goto(`/clientes/${LOCAL.id}`);
    const editor = page.getByRole('region', { name: 'Editar horario de atención' });
    await expect(editor).toBeVisible();
    await sinViolaciones(page);
    await editor.getByRole('button', { name: 'LUN A VIE' }).click();
    await editor.getByRole('button', { name: 'Abre a las 10:00' }).click();
    await editor.getByRole('button', { name: 'Cierra a las 18:00' }).click();
    await editor.getByRole('button', { name: 'OTRO HORARIO' }).click();
    await sinViolaciones(page);
    for (const b of await editor.getByRole('button').all()) expect((await b.boundingBox())?.height ?? 64).toBeGreaterThanOrEqual(63);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await editor.getByRole('button', { name: 'GUARDAR HORARIO' }).click();
    await expect(editor.getByText(/Horario guardado como dato manual/)).toBeVisible();
    expect(enviado).toMatchObject({ dias: expect.arrayContaining([{ dia: 1, cerrado: false, tramos: [{ desde: 600, hasta: 1080 }] }, { dia: 0, cerrado: true, tramos: [] }]) });
  });
});
