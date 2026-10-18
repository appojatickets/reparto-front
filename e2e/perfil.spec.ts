import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { CHOFER, SESION, conSesionGuardada, simularApi, type Rutas } from './ayudas';

const sinViolaciones = async (page: Page): Promise<void> => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
};

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const FOTO_EN = '2026-10-10T12:00:00.000Z';

/** El almacenamiento simulado: sirve una imagen y acepta subidas. */
const conAlmacen = async (page: Page): Promise<void> => {
  await page.route('https://alm.test/**', (route) => {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,PUT,OPTIONS' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (route.request().method() === 'PUT') return route.fulfill({ status: 200, headers: cors, json: {} });
    return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'image/png' }, body: PNG });
  });
};

const rutas = (usuario: object, extra: Rutas = {}): Rutas => ({
  'GET /v1/me': () => ({ status: 200, json: { ...usuario, empresaId: 'e1' } }),
  'POST /v1/auth/login': () => ({ status: 200, json: { ...SESION, usuario } }),
  'GET /v1/jornada': () => ({ status: 200, json: null }),
  'GET /v1/camiones': () => ({ status: 200, json: { camiones: [] } }),
  ...extra,
});

test.describe('foto de perfil', () => {
  test('con foto, se ve en la cabecera y en el perfil; la pantalla es accesible y sus botones grandes', async ({ page }) => {
    await simularApi(page, rutas({ ...CHOFER, editor: false, fotoEn: FOTO_EN }, {
      'GET /v1/usuarios/u2/foto-url': () => ({ status: 200, json: { url: 'https://alm.test/perfil.png', expiraEnSegundos: 300 } }),
    }));
    await conAlmacen(page);
    await conSesionGuardada(page);
    await page.goto('/perfil');
    await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();
    await expect(page.locator('.avatar--grande img')).toBeVisible();
    await expect(page.locator('.cabecera .avatar img')).toBeVisible();
    await expect(page.getByRole('button', { name: 'CAMBIAR MI FOTO' })).toBeVisible();
    await sinViolaciones(page);
    for (const b of await page.getByRole('button').all()) expect((await b.boundingBox())?.height ?? 64).toBeGreaterThanOrEqual(63);
  });

  test('sin foto, se ven las iniciales; al subir una imagen aparece enseguida y se puede quitar', async ({ page }) => {
    let fotoEn: string | undefined;
    let registrado: unknown;
    await simularApi(page, rutas({ ...CHOFER, editor: false }, {
      'GET /v1/me': () => ({ status: 200, json: { ...CHOFER, editor: false, empresaId: 'e1', ...(fotoEn ? { fotoEn } : {}) } }),
      'POST /v1/me/foto/url-subida': () => ({ status: 200, json: { path: 'e1/perfil/u2/a.webp', url: 'https://alm.test/subir' } }),
      'PUT /v1/me/foto': (req) => { registrado = req.postDataJSON(); fotoEn = FOTO_EN; return { status: 204 }; },
      'DELETE /v1/me/foto': () => { fotoEn = undefined; return { status: 204 }; },
      'GET /v1/usuarios/u2/foto-url': () => ({ status: 200, json: { url: 'https://alm.test/perfil.png', expiraEnSegundos: 300 } }),
    }));
    await conAlmacen(page);
    await conSesionGuardada(page);
    await page.goto('/perfil');
    await expect(page.locator('.avatar--grande')).toHaveText('JP');
    await sinViolaciones(page);
    await page.getByLabel('Elegir mi foto').setInputFiles({ name: 'yo.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByText('Listo: tu foto ya se ve junto a tu nombre.')).toBeVisible();
    expect(registrado).toEqual({ path: 'e1/perfil/u2/a.webp' });
    await expect(page.locator('.avatar--grande img')).toBeVisible();
    await expect(page.locator('.cabecera .avatar img')).toBeVisible();
    await sinViolaciones(page);
    await page.getByRole('button', { name: 'QUITAR MI FOTO' }).click();
    await page.getByRole('button', { name: 'SÍ, QUITARLA' }).click();
    await expect(page.getByText('Tu foto se quitó.')).toBeVisible();
    await expect(page.locator('.avatar--grande')).toHaveText('JP');
  });
});

test.describe('quiénes aportaron al local', () => {
  test('una fila chica que se despliega: accesible, con objetivos grandes, y el detalle muestra qué aportó cada uno', async ({ page }) => {
    await simularApi(page, rutas({ ...CHOFER, editor: true, fotoEn: FOTO_EN }, {
      'GET /v1/clientes/l1': () => ({ status: 200, json: { id: 'l1', clienteId: 'c1', razonSocial: 'Bazar Luz', direccion: 'Calle 1 100', comuna: 'Maipú', lat: -33.5, lng: -70.7, pinEstado: 'validado', pinVerificado: true, fotoPath: 'e1/l1/f.webp' } }),
      'GET /v1/locales/l1': () => ({ status: 200, json: { id: 'l1', clienteId: 'c1', razonSocial: 'Bazar Luz', direccion: 'Calle 1 100', comuna: 'Maipú', lat: -33.5, lng: -70.7, pinEstado: 'validado', pinVerificado: true, fotoPath: 'e1/l1/f.webp' } }),
      'GET /v1/locales/l1/foto-url': () => ({ status: 200, json: { url: 'https://alm.test/perfil.png', expiraEnSegundos: 300 } }),
      'GET /v1/locales/l1/contribuyentes': () => ({ status: 200, json: { contribuyentes: [
        { usuarioId: 'u2', nombre: 'Juan Pérez', fotoEn: FOTO_EN, aportes: ['foto', 'entregas'], entregas: 3 },
        { usuarioId: 'u3', nombre: 'María Rojas', aportes: ['pin'], entregas: 0 },
      ] } }),
      'GET /v1/usuarios/u2/foto-url': () => ({ status: 200, json: { url: 'https://alm.test/perfil.png', expiraEnSegundos: 300 } }),
    }));
    await conAlmacen(page);
    await conSesionGuardada(page);
    await page.goto('/clientes/l1');
    const fila = page.getByRole('button', { name: /Aportaron: Juan Pérez y María Rojas/ });
    await expect(fila).toBeVisible();
    expect((await fila.boundingBox())?.height ?? 64).toBeGreaterThanOrEqual(63);
    await sinViolaciones(page);
    await fila.click();
    const lista = page.getByRole('list', { name: 'Quiénes aportaron a este local' });
    await expect(lista.getByText('Subió la foto · 3 entregas')).toBeVisible();
    await expect(lista.getByText('Verificó el pin')).toBeVisible();
    await sinViolaciones(page);
  });
});
