import type { Page, Request } from '@playwright/test';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization,content-type',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,OPTIONS',
};

export type Respuesta = { status: number; json?: unknown };
export type Rutas = Record<string, (req: Request) => Respuesta | Promise<Respuesta>>;

export const SALUD = { status: 'ok', database: 'ok', timestamp: '2026-10-05T12:00:00.000Z' };
export const ADMIN = { id: 'u1', username: 'admin', nombre: 'Matías Carrión', rol: 'admin', activo: true };
export const CHOFER = { id: 'u2', username: 'jperez', nombre: 'Juan Pérez', rol: 'chofer', activo: true };
export const SESION = { accessToken: 'at', refreshToken: 'rt', expiraEnSegundos: 3600 };

/** Simula la API con CORS. Clave: «MÉTODO /ruta». Lo que no esté definido responde 404. */
export const simularApi = async (page: Page, rutas: Rutas, retrasoSaludMs = 0): Promise<void> => {
  // Las pruebas parten con la vista grande ya elegida (si no, la app la pregunta al entrar).
  await page.addInitScript(() => {
    try {
      if (!localStorage.getItem('reparto.vista.v1')) localStorage.setItem('reparto.vista.v1', 'grande');
      // Y con su forma de armar la ruta ya elegida (si no, la primera vez la app lo pregunta).
      if (!localStorage.getItem('reparto.armado.v1')) localStorage.setItem('reparto.armado.v1', 'calcular');
    } catch { /* sin almacenamiento */ }
  });
  await page.route('http://api.test/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const clave = `${req.method()} ${new URL(req.url()).pathname}`;
    if (clave === 'GET /v1/health') {
      if (retrasoSaludMs > 0) await new Promise((r) => setTimeout(r, retrasoSaludMs));
      return route.fulfill({ status: 200, headers: CORS, json: SALUD });
    }
    const h = rutas[clave];
    if (!h) return route.fulfill({ status: 404, headers: CORS, json: { codigo: 'NO_ENCONTRADO', mensaje: `sin simular: ${clave}` } });
    const r = await h(req);
    return route.fulfill({ status: r.status, headers: CORS, ...(r.json !== undefined ? { json: r.json } : {}) });
  });
};

/** Deja una sesión ya iniciada en el dispositivo (como si el usuario hubiera entrado antes). */
export const conSesionGuardada = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    localStorage.setItem('reparto.sesion.v1', JSON.stringify({ accessToken: 'at', refreshToken: 'rt' }));
  });
};
