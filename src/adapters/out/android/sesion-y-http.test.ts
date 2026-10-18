import { describe, expect, it, vi } from 'vitest';
import type { NativeBridge } from './bridge';
import { crearSesionYHttpAndroid } from './sesion-y-http';
const tokens = { accessToken: 'access-prueba', refreshToken: 'refresh-prueba', expiraEnSegundos: 3600 };
const montar = () => {
  const bridge = {
    configure: vi.fn<NativeBridge['configure']>(() => Promise.resolve()),
    session: vi.fn<NativeBridge['session']>(() => Promise.resolve({ tokens })),
    clear: vi.fn<NativeBridge['clear']>(() => Promise.resolve()),
    request: vi.fn<NativeBridge['request']>(() => Promise.resolve({ status: 200, body: '{"ok":true}', tokens })),
    start: vi.fn<NativeBridge['start']>(() => Promise.resolve()), stop: vi.fn<NativeBridge['stop']>(() => Promise.resolve()),
    status: vi.fn<NativeBridge['status']>(() => Promise.resolve({ activo: false, pendientes: 0 })),
  } satisfies NativeBridge;
  return bridge;
};
describe('sesión y peticiones nativas', () => {
  it('TERMINAR RUTA envía JSON vacío explícito, no un POST con formato form implícito', async () => {
    const bridge = montar();
    const client = await crearSesionYHttpAndroid(bridge, 'https://api.example.test');
    await client.fetch('https://api.example.test/v1/jornada/terminar', { method: 'POST', headers: { authorization: 'Bearer access-prueba' } });
    expect(bridge.request).toHaveBeenCalledWith({ method: 'POST', path: '/v1/jornada/terminar', body: '{}', authenticated: true });
  });

  it('restaura la sesión cifrada y envía la API por el puente nativo', async () => {
    const bridge = montar();
    const client = await crearSesionYHttpAndroid(bridge, 'https://api.example.test');
    expect(client.store.cargar()).toEqual(tokens);
    const r = await client.fetch('https://api.example.test/v1/jornada/posiciones', { method: 'POST', headers: { authorization: 'Bearer access-prueba' }, body: '{"puntos":[]}' });
    expect(r.status).toBe(200);
    expect(bridge.request).toHaveBeenCalledWith({ method: 'POST', path: '/v1/jornada/posiciones', authenticated: true, body: '{"puntos":[]}' });
    client.store.borrar();
    expect(client.store.cargar()).toBeUndefined();
    expect(bridge.clear).toHaveBeenCalledTimes(1);
  });
  it('no manda fotos o dominios externos al puente autenticado', async () => {
    const bridge = montar(); const fallback = vi.fn<typeof fetch>(() => Promise.resolve(new Response('', { status: 200 })));
    const client = await crearSesionYHttpAndroid(bridge, 'https://api.example.test', fallback);
    await client.fetch('https://storage.example.test/foto', { method: 'PUT', body: 'imagen' });
    expect(bridge.request).not.toHaveBeenCalled();
    expect(await (fallback.mock.calls[0]?.[0] as Request).text()).toBe('imagen');
  });
  it('no permite HTTP sin cifrar ni entrega respuestas de solicitudes canceladas', async () => {
    const bridge = montar();
    await expect(crearSesionYHttpAndroid(bridge, 'http://api.example.test')).rejects.toThrow('HTTPS');
    const client = await crearSesionYHttpAndroid(bridge, 'https://api.example.test');
    const control = new AbortController(); control.abort();
    await expect(client.fetch('https://api.example.test/v1/me', { signal: control.signal })).rejects.toThrow();
    expect(bridge.request).not.toHaveBeenCalled();
  });
});
