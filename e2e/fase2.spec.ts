import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, CHOFER, SESION, conSesionGuardada, simularApi, type Rutas } from './ayudas';

const LOCAL = { id: '123e4567-e89b-42d3-a456-426614174000', clienteId: 'c1', razonSocial: 'Rabelo Mágica SpA', rut: '76543210-3', direccion: 'Av. Providencia 2500', comuna: 'Providencia', lat: -33.4372, lng: -70.6506, pinEstado: 'validado', streetviewRumbo: 120, nota: 'portón verde' };
const BUSQUEDA = { resultados: [{ localId: LOCAL.id, clienteId: 'c1', razonSocial: 'Rabelo Mágica SpA', direccion: LOCAL.direccion, comuna: 'Providencia', pinEstado: 'validado', score: 0.9 }] };
const PROPUESTA = { id: '223e4567-e89b-42d3-a456-426614174000', direccion: 'Calle 1 10', lat: -33.6, lng: -70.8, distanciaActualM: 900, estado: 'pendiente', proponenteId: 'u2', creadaEn: '2026-10-05T12:00:00.000Z', razonSocial: 'Rabelo', comuna: 'Maipú' };

const comunes = (usuario: typeof ADMIN | typeof CHOFER): Rutas => ({
  'GET /v1/me': () => ({ status: 200, json: { ...usuario, empresaId: 'e1' } }),
  'POST /v1/auth/login': () => ({ status: 200, json: { ...SESION, usuario } }),
  'GET /v1/clientes/buscar': () => ({ status: 200, json: BUSQUEDA }),
  [`GET /v1/locales/${LOCAL.id}`]: () => ({ status: 200, json: LOCAL }),
  'GET /v1/usuarios': () => ({ status: 200, json: { usuarios: [ADMIN, CHOFER] } }),
  'GET /v1/pines/propuestas': () => ({ status: 200, json: { propuestas: [PROPUESTA] } }),
});

const sinViolaciones = async (page: Page): Promise<void> => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
};

test.describe('arranque y entrada', () => {
  test('muestra «despertando servidor» si tarda y luego la pantalla de entrada', async ({ page }) => {
    await simularApi(page, comunes(ADMIN), 4500);
    await page.goto('/');
    await expect(page.getByRole('status')).toContainText('Despertando servidor', { timeout: 6000 });
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible({ timeout: 8000 });
    await sinViolaciones(page);
  });

  test('el administrador entra con usuario y clave y ve su menú completo', async ({ page }) => {
    await simularApi(page, comunes(ADMIN));
    await page.goto('/');
    await page.getByLabel('Usuario').fill('admin');
    await page.getByLabel('Clave (6 números)').fill('482915');
    await page.getByRole('button', { name: 'ENTRAR' }).click();
    await expect(page.getByRole('heading', { name: 'Hola, Matías' })).toBeVisible();
    for (const n of ['BUSCAR CLIENTE', 'CLIENTE NUEVO', 'PINES DE LOCALES', 'IMPORTAR CLIENTES', 'USUARIOS']) await expect(page.getByRole('link', { name: n })).toBeVisible();
    await sinViolaciones(page);
    expect(await page.evaluate(() => localStorage.getItem('reparto.sesion.v1'))).toContain('"accessToken":"at"');
  });

  test('una clave incorrecta muestra el aviso con los intentos que quedan', async ({ page }) => {
    await simularApi(page, { ...comunes(ADMIN), 'POST /v1/auth/login': () => ({ status: 401, json: { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Usuario o clave incorrectos. Te quedan 4 intentos.' } }) });
    await page.goto('/');
    await page.getByLabel('Usuario').fill('admin');
    await page.getByLabel('Clave (6 números)').fill('000001');
    await page.getByRole('button', { name: 'ENTRAR' }).click();
    await expect(page.getByRole('alert')).toContainText('Te quedan 4 intentos');
    await sinViolaciones(page);
  });

  test('la sesión sobrevive a recargar la página', async ({ page }) => {
    await simularApi(page, comunes(ADMIN));
    await conSesionGuardada(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Hola, Matías' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Hola, Matías' })).toBeVisible();
  });

  test('un chofer ve solo su ruta y no puede abrir pantallas de administración', async ({ page }) => {
    await simularApi(page, comunes(CHOFER));
    await conSesionGuardada(page);
    await page.goto('/admin/usuarios');
    await expect(page.getByText('Tu ruta del día estará disponible muy pronto.')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('link', { name: 'USUARIOS' })).toHaveCount(0);
  });

  test('si el servidor rechaza la sesión guardada, se vuelve a la entrada', async ({ page }) => {
    await simularApi(page, { ...comunes(ADMIN), 'GET /v1/me': () => ({ status: 401, json: { codigo: 'NO_AUTENTICADO', mensaje: 'venció' } }), 'POST /v1/auth/refresh': () => ({ status: 401, json: { codigo: 'NO_AUTENTICADO', mensaje: 'venció' } }) });
    await conSesionGuardada(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('reparto.sesion.v1'))).toBeNull();
  });
});

test.describe('pantallas de administración y despacho', () => {
  test.beforeEach(async ({ page }) => {
    await simularApi(page, {
      ...comunes(ADMIN),
      'POST /v1/clientes/importaciones': () => ({ status: 200, json: { totalFilas: 2, validas: 1, errores: [{ fila: 2, errores: [{ codigo: 'COMUNA_INVALIDA', mensaje: 'La comuna no es de la Región Metropolitana.' }] }], resumen: { clientesCreados: 1, clientesActualizados: 0, localesCreados: 1, localesActualizados: 0 } } }),
    });
    await conSesionGuardada(page);
  });

  test('buscar clientes: escribir «rabe» muestra la tarjeta y pasa axe', async ({ page }) => {
    await page.goto('/clientes');
    await page.getByLabel('Nombre o dirección').fill('rabe');
    await expect(page.getByRole('link', { name: 'Rabelo Mágica SpA' })).toBeVisible();
    await expect(page.getByText('PIN VALIDADO')).toBeVisible();
    await sinViolaciones(page);
  });

  test('detalle del local: enlaces de navegación con coordenadas y accesibilidad', async ({ page }) => {
    await page.goto(`/clientes/${LOCAL.id}`);
    await expect(page.getByRole('heading', { name: 'Rabelo Mágica SpA' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'IR CON WAZE' })).toHaveAttribute('href', 'https://waze.com/ul?ll=-33.4372,-70.6506&navigate=yes');
    await sinViolaciones(page);
  });

  test('cliente nuevo y usuarios pasan axe', async ({ page }) => {
    await page.goto('/clientes/nuevo');
    await expect(page.getByRole('heading', { name: 'Cliente nuevo' })).toBeVisible();
    await sinViolaciones(page);
    await page.goto('/admin/usuarios');
    await expect(page.getByText('Juan Pérez')).toBeVisible();
    await sinViolaciones(page);
  });

  test('importar: pegar la planilla, ver la vista previa, importar y ver las filas con problemas', async ({ page }) => {
    await page.goto('/admin/importar');
    await page.getByLabel('O pega aquí la planilla').fill('Rut\tRazón Social\tDirección\tComuna\n12.345.678-5\tRabelo SpA\tAv. X 1\tMaipú\n\tKiosko Sol\tCalle 2\tMarte');
    await expect(page.getByText('2 filas listas para importar.')).toBeVisible();
    await sinViolaciones(page);
    await page.getByRole('button', { name: 'IMPORTAR' }).click();
    const resultado = page.getByRole('region', { name: 'Resultado de la importación' });
    await expect(resultado).toContainText('Clientes nuevos: 1');
    await expect(resultado).toContainText('La comuna no es de la Región Metropolitana.');
    await sinViolaciones(page);
  });

  test('pines: revisión con distancia y accesibilidad', async ({ page }) => {
    await page.goto('/pines');
    await expect(page.getByText('900 m del pin actual')).toBeVisible();
    await sinViolaciones(page);
  });
});

test.describe('accesibilidad móvil', () => {
  test('letra base >= 28 px y objetivos táctiles >= 64 px en entrada e inicio', async ({ page }) => {
    await simularApi(page, comunes(ADMIN));
    await page.goto('/');
    expect(await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize))).toBeGreaterThanOrEqual(28);
    const entrar = await page.getByRole('button', { name: 'ENTRAR' }).boundingBox();
    expect(entrar?.height ?? 0).toBeGreaterThanOrEqual(64);
    await page.getByLabel('Usuario').fill('admin');
    await page.getByLabel('Clave (6 números)').fill('482915');
    await page.getByRole('button', { name: 'ENTRAR' }).click();
    for (const enlace of await page.getByRole('link').all()) expect((await enlace.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(64);
    expect((await page.getByRole('button', { name: 'SALIR' }).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(64);
  });

  for (const ruta of ['/', '/clientes', '/clientes/nuevo', '/admin/importar', '/admin/usuarios', '/pines']) {
    test(`sin scroll horizontal al 200% de escala en 360 px: ${ruta}`, async ({ page }) => {
      await simularApi(page, comunes(ADMIN));
      await conSesionGuardada(page);
      await page.setViewportSize({ width: 180, height: 370 });
      await page.goto(ruta);
      await expect(page.getByRole('heading').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    });
  }
});
