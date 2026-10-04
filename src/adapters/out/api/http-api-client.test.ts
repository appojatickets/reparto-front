import { describe, expect, it, vi } from 'vitest';
import type { Tokens } from '../../../application/modelos';
import { crearSesionStore } from '../sesion/local-storage-store';
import { createHttpApiClient } from './http-api-client';

const BASE = 'http://api.test';
const salud = { status: 'ok', database: 'ok', timestamp: '2026-10-05T12:00:00.000Z' };
const json = (status: number, data: unknown): Response =>
  status === 204 ? new Response(null, { status }) : new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

const memoria = () => {
  const datos = new Map<string, string>();
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => { datos.set(k, v); }, removeItem: (k: string) => { datos.delete(k); } };
};

const montar = (manejador: (req: Request) => Response | Promise<Response>, tokens?: Tokens, extra: { esperasMs?: readonly number[] } = {}) => {
  const store = crearSesionStore(memoria());
  if (tokens) store.guardar(tokens);
  const llamadas: Request[] = [];
  const fetchFn = vi.fn((input: Request) => {
    llamadas.push(input.clone());
    return Promise.resolve(manejador(input));
  });
  const alExpirar = vi.fn();
  const esperas: number[] = [];
  const avisos: boolean[] = [];
  const api = createHttpApiClient({
    baseUrl: BASE, store, alExpirarSesion: alExpirar, fetch: fetchFn as unknown as typeof fetch,
    esperasMs: extra.esperasMs ?? [10, 20, 30],
    esperar: (ms) => { esperas.push(ms); return Promise.resolve(); },
    alEsperarServidor: (a) => { avisos.push(a); },
  });
  return { api, store, llamadas, alExpirar, fetchFn, esperas, avisos };
};

const TOK: Tokens = { accessToken: 'viejo', refreshToken: 'r1' };
const USUARIO = { id: 'u1', username: 'jperez', nombre: 'Juan Pérez', rol: 'chofer' };

describe('salud', () => {
  it('200 y 503 devuelven el reporte; falla de red y cuerpo vacío se distinguen', async () => {
    expect((await montar(() => json(200, salud)).api.getHealth(new AbortController().signal))).toEqual({ ok: true, value: salud });
    const degradado = { ...salud, status: 'degraded', database: 'error' };
    expect(await montar(() => json(503, degradado)).api.getHealth(new AbortController().signal)).toEqual({ ok: true, value: degradado });
    expect(await montar(() => { throw new TypeError('Failed to fetch'); }).api.getHealth(new AbortController().signal)).toEqual({ ok: false, error: { kind: 'NETWORK' } });
    expect(await montar(() => new Response(null, { status: 502 })).api.getHealth(new AbortController().signal)).toEqual({ ok: false, error: { kind: 'UNEXPECTED' } });
  });
});

describe('sesión', () => {
  it('login: manda usuario y clave, y devuelve tokens + usuario (sin guardar: eso lo hace el caso de uso)', async () => {
    const { api, llamadas, store } = montar(() => json(200, { accessToken: 'a', refreshToken: 'r', expiraEnSegundos: 3600, usuario: { ...USUARIO, activo: true } }));
    const r = await api.iniciarSesion('jperez', '482915');
    expect(r).toEqual({ ok: true, value: { tokens: { accessToken: 'a', refreshToken: 'r' }, usuario: USUARIO } });
    expect(await llamadas[0]?.json()).toEqual({ username: 'jperez', pin: '482915' });
    expect(store.cargar()).toBeUndefined();
  });

  it('un error de negocio llega con status, código y mensaje en español', async () => {
    const { api } = montar(() => json(401, { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Usuario o clave incorrectos. Te quedan 4 intentos.', detalle: { intentosRestantes: 4 } }));
    expect(await api.iniciarSesion('x', 'y')).toEqual({ ok: false, error: { kind: 'HTTP', status: 401, codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Usuario o clave incorrectos. Te quedan 4 intentos.', detalle: { intentosRestantes: 4 } } });
  });

  it('el login NO intenta renovar la sesión ante un 401 (es una clave mala, no un token vencido)', async () => {
    const { api, llamadas } = montar(() => json(401, { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'x' }), TOK);
    await api.iniciarSesion('x', 'y');
    expect(llamadas).toHaveLength(1);
  });

  it('las llamadas autenticadas llevan el Bearer guardado', async () => {
    const { api, llamadas } = montar(() => json(200, { ...USUARIO, activo: true, empresaId: 'e1' }), TOK);
    await api.yo();
    expect(llamadas[0]?.headers.get('authorization')).toBe('Bearer viejo');
  });

  it('un 401 renueva la sesión una vez, guarda los tokens nuevos y repite la llamada', async () => {
    let yoLlamadas = 0;
    const { api, store, llamadas } = montar((req) => {
      const ruta = new URL(req.url).pathname;
      if (ruta === '/v1/auth/refresh') return json(200, { accessToken: 'nuevo', refreshToken: 'r2', expiraEnSegundos: 3600 });
      return ++yoLlamadas === 1 ? json(401, { codigo: 'NO_AUTENTICADO', mensaje: 'venció' }) : json(200, { ...USUARIO, activo: true, empresaId: 'e1' });
    }, TOK);
    const r = await api.yo();
    expect(r.ok).toBe(true);
    expect(store.cargar()).toEqual({ accessToken: 'nuevo', refreshToken: 'r2' });
    expect(llamadas.map((c) => new URL(c.url).pathname)).toEqual(['/v1/me', '/v1/auth/refresh', '/v1/me']);
    expect(llamadas[2]?.headers.get('authorization')).toBe('Bearer nuevo');
  });

  it('varias llamadas con 401 simultáneas comparten UNA sola renovación', async () => {
    const vistos = new Set<string>();
    const { api, llamadas } = montar((req) => {
      const ruta = new URL(req.url).pathname;
      if (ruta === '/v1/auth/refresh') return json(200, { accessToken: 'nuevo', refreshToken: 'r2', expiraEnSegundos: 3600 });
      const auth = req.headers.get('authorization') ?? '';
      vistos.add(auth);
      return auth === 'Bearer viejo' ? json(401, { codigo: 'NO_AUTENTICADO', mensaje: 'venció' }) : json(200, { usuarios: [] });
    }, TOK);
    await Promise.all([api.listarUsuarios(), api.listarUsuarios(), api.listarUsuarios()]);
    expect(llamadas.filter((c) => new URL(c.url).pathname === '/v1/auth/refresh')).toHaveLength(1);
  });

  it('si el refresh también es rechazado (401) borra la sesión y avisa para volver a entrar', async () => {
    const { api, store, alExpirar } = montar((req) => (new URL(req.url).pathname === '/v1/auth/refresh' ? json(401, { codigo: 'NO_AUTENTICADO', mensaje: 'venció' }) : json(401, { codigo: 'NO_AUTENTICADO', mensaje: 'venció' })), TOK);
    const r = await api.yo();
    expect(!r.ok && r.error.status).toBe(401);
    expect(store.cargar()).toBeUndefined();
    expect(alExpirar).toHaveBeenCalledTimes(1);
  });

  it('si no hay señal al renovar, la sesión se conserva', async () => {
    const { api, store, alExpirar } = montar((req) => {
      if (new URL(req.url).pathname === '/v1/auth/refresh') throw new TypeError('Failed to fetch');
      return json(401, { codigo: 'NO_AUTENTICADO', mensaje: 'venció' });
    }, TOK);
    await api.yo();
    expect(store.cargar()).toEqual(TOK);
    expect(alExpirar).not.toHaveBeenCalled();
  });
});

describe('llamadas de negocio', () => {
  it('buscar clientes manda la consulta y devuelve la lista', async () => {
    const { api, llamadas } = montar(() => json(200, { resultados: [{ localId: 'l1', clienteId: 'c1', razonSocial: 'Rabelo Mágica SpA', direccion: 'x', comuna: 'Maipú', pinEstado: 'pendiente', score: 1 }] }), TOK);
    const r = await api.buscarClientes('rabe', { comuna: 'Maipú', limite: 5 });
    expect(r.ok && r.value[0]?.razonSocial).toBe('Rabelo Mágica SpA');
    expect(new URL(llamadas[0]?.url ?? '').search).toBe('?q=rabe&comuna=Maip%C3%BA&limite=5');
  });

  it('las acciones de la API sin cuerpo (204) devuelven éxito vacío', async () => {
    const { api } = montar(() => json(204, null), TOK);
    expect(await api.resolverPropuesta('123e4567-e89b-42d3-a456-426614174000', 'aceptar')).toEqual({ ok: true, value: undefined });
    expect(await api.cambiarEstadoUsuario('123e4567-e89b-42d3-a456-426614174000', false)).toEqual({ ok: true, value: undefined });
  });

  it('un 403 se informa como error HTTP con su código', async () => {
    const { api } = montar(() => json(403, { codigo: 'SIN_PERMISO', mensaje: 'No tienes permiso para esta acción.' }), TOK);
    const r = await api.listarUsuarios();
    expect(!r.ok && r.error).toMatchObject({ kind: 'HTTP', status: 403, codigo: 'SIN_PERMISO' });
  });

  it('importar clientes manda las filas en el cuerpo', async () => {
    const respuesta = { totalFilas: 1, validas: 1, errores: [], resumen: { clientesCreados: 1, clientesActualizados: 0, localesCreados: 1, localesActualizados: 0 } };
    const { api, llamadas } = montar(() => json(200, respuesta), TOK);
    const r = await api.importarClientes([{ razonSocial: 'X', direccion: 'Y', comuna: 'Maipú' }]);
    expect(r).toEqual({ ok: true, value: respuesta });
    expect(await llamadas[0]?.json()).toEqual({ filas: [{ razonSocial: 'X', direccion: 'Y', comuna: 'Maipú' }] });
  });

  it('una caída de red en una llamada de negocio es NETWORK', async () => {
    const { api } = montar(() => { throw new TypeError('Failed to fetch'); }, TOK);
    expect(await api.listarUsuarios()).toEqual({ ok: false, error: { kind: 'NETWORK' } });
  });
});

describe('servidor dormido (Render Free): reintentos automáticos', () => {
  const USUARIOS = { usuarios: [] };

  it('una consulta que falla por red se reintenta hasta que el servidor responde, y avisa mientras espera', async () => {
    let n = 0;
    const { api, esperas, avisos, llamadas } = montar(() => { if (++n <= 2) throw new TypeError('Failed to fetch'); return json(200, USUARIOS); }, TOK);
    expect(await api.listarUsuarios()).toEqual({ ok: true, value: [] });
    expect(llamadas).toHaveLength(3);
    expect(esperas).toEqual([10, 20]);
    expect(avisos).toEqual([true, false]);
  });

  it('un 503 del proxy (sin cuerpo de la API) también se reintenta', async () => {
    let n = 0;
    const { api } = montar(() => (++n === 1 ? new Response('<html>Service Unavailable</html>', { status: 503 }) : json(200, USUARIOS)), TOK);
    expect((await api.listarUsuarios()).ok).toBe(true);
    expect(n).toBe(2);
  });

  it('un 502 con código de la API (error de negocio) NO se reintenta', async () => {
    const { api, llamadas, avisos } = montar(() => json(502, { codigo: 'SERVICIO_EXTERNO', mensaje: 'No se pudo conectar.' }), TOK);
    const r = await api.listarUsuarios();
    expect(!r.ok && r.error.status).toBe(502);
    expect(llamadas).toHaveLength(1);
    expect(avisos).toEqual([]);
  });

  it('si el servidor nunca despierta, se rinde al agotar las esperas y deja de avisar', async () => {
    const { api, llamadas, avisos } = montar(() => { throw new TypeError('Failed to fetch'); }, TOK, { esperasMs: [1, 1] });
    expect(await api.listarUsuarios()).toEqual({ ok: false, error: { kind: 'NETWORK' } });
    expect(llamadas).toHaveLength(3);
    expect(avisos).toEqual([true, false]);
  });

  it('las acciones que crean cosas (crear usuario, crear cliente, aceptar pin) NO se repiten solas', async () => {
    const { api, llamadas } = montar(() => { throw new TypeError('Failed to fetch'); }, TOK);
    await api.crearUsuario({ nombre: 'A', apellidoPaterno: 'B', rol: 'chofer', pin: '482915' });
    await api.crearCliente({ razonSocial: 'X' });
    await api.resolverPropuesta('123e4567-e89b-42d3-a456-426614174000', 'aceptar');
    expect(llamadas).toHaveLength(3); // una sola llamada por acción
  });

  it('el login se reintenta (no cuenta como intento fallido porque nunca llegó al servidor)', async () => {
    let n = 0;
    const { api } = montar(() => { if (++n === 1) throw new TypeError('Failed to fetch'); return json(200, { accessToken: 'a', refreshToken: 'r', expiraEnSegundos: 3600, usuario: { ...USUARIO, activo: true } }); });
    expect((await api.iniciarSesion('jperez', '482915')).ok).toBe(true);
    expect(n).toBe(2);
  });

  it('una clave incorrecta (401 de la API) no se reintenta', async () => {
    const { api, llamadas } = montar(() => json(401, { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'mal' }));
    await api.iniciarSesion('x', 'y');
    expect(llamadas).toHaveLength(1);
  });

  it('una búsqueda cancelada por quien escribe no sigue reintentando', async () => {
    const control = new AbortController();
    const { api, llamadas } = montar(() => { control.abort(); throw new TypeError('Failed to fetch'); }, TOK);
    await api.buscarClientes('rabe', { signal: control.signal });
    expect(llamadas).toHaveLength(1);
  });
});
