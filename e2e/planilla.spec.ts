import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, SESION, conSesionGuardada, simularApi, type Rutas } from './ayudas';

const sinViolaciones = async (page: Page): Promise<void> => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
};

const TABLA = ['Chofer\tAyudante\tCamión\tVendedor\tComuna', 'Juan Pérez\tPedro Gómez\tSDTS23\tV12 Mario Quiroz - V13 Oscar Baeza\tMaipú, Pudahuel', 'Luis Rojas\t\tLZYS23\tV14\t'].join('\n');

const rutas = (extra: Rutas = {}): Rutas => ({
  'GET /v1/me': () => ({ status: 200, json: { ...ADMIN, empresaId: 'e1' } }),
  'POST /v1/auth/login': () => ({ status: 200, json: { ...SESION, usuario: ADMIN } }),
  'GET /v1/planilla': () => ({ status: 200, json: { asignaciones: [] } }),
  ...extra,
});

test.describe('planilla del día', () => {
  test('pegar, ver la vista previa, aplicar y ver el resultado: accesible y con objetivos táctiles grandes', async ({ page }) => {
    let enviado: unknown;
    await simularApi(page, rutas({
      'POST /v1/planilla': (req) => {
        enviado = req.postDataJSON();
        return {
          status: 200,
          json: { filas: [
            { patente: 'SDTS23', valida: true, errores: [], camionCreado: true, alias: '23', vendedoresCreados: 2, chofer: { nombre: 'Juan Pérez', estado: 'enlazada' }, ayudante: { nombre: 'Pedro Gómez', estado: 'sin_usuario' }, jornadasAbiertas: 1 },
            { patente: 'LZYS23', valida: false, errores: ['«LZYS23» no es una patente (por ejemplo ABCD12).'], camionCreado: false, vendedoresCreados: 0, jornadasAbiertas: 0 },
          ] },
        };
      },
    }));
    await conSesionGuardada(page);
    await page.goto('/planilla');
    await expect(page.getByRole('heading', { name: 'Planilla del día' })).toBeVisible();
    await sinViolaciones(page);
    await page.getByLabel('Pega aquí la planilla').fill(TABLA);
    await expect(page.getByRole('list', { name: 'Vista previa de la planilla' })).toBeVisible();
    await expect(page.getByText('Se van a cargar 2 camiones')).toBeVisible();
    await sinViolaciones(page);
    await page.getByRole('button', { name: 'APLICAR LA PLANILLA' }).click();
    await expect(page.getByText('1 de 2 camiones aplicados.')).toBeVisible();
    await expect(page.getByText(/Ayudante Pedro Gómez: no tiene usuario/)).toBeVisible();
    expect(enviado).toMatchObject({ filas: [{ patente: 'SDTS23', chofer: 'Juan Pérez', comunas: ['Maipú', 'Pudahuel'] }, { patente: 'LZYS23', chofer: 'Luis Rojas' }] });
    await sinViolaciones(page);
    for (const b of await page.getByRole('button').all()) expect((await b.boundingBox())?.height ?? 64).toBeGreaterThanOrEqual(63);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});
