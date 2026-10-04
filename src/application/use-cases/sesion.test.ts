import { describe, expect, it, vi } from 'vitest';
import { crearCerrarSesion, crearIniciarSesion, crearRestaurarSesion } from './sesion';
import { err, fakeApi, fakeStore, http, ok, TOKENS, USUARIO } from './fakes.test-util';

describe('iniciarSesion', () => {
  it('normaliza el usuario, guarda los tokens y devuelve al usuario', async () => {
    const iniciar = vi.fn(() => Promise.resolve(ok({ tokens: TOKENS, usuario: USUARIO })));
    const store = fakeStore();
    const r = await crearIniciarSesion({ api: fakeApi({ iniciarSesion: iniciar }), store })('  JPerez ', ' 482915 ');
    expect(r).toEqual({ ok: true, value: USUARIO });
    expect(iniciar).toHaveBeenCalledWith('jperez', '482915');
    expect(store.guardar).toHaveBeenCalledWith(TOKENS);
  });

  it('exige usuario y clave sin llamar a la API', async () => {
    const iniciar = vi.fn();
    const login = crearIniciarSesion({ api: fakeApi({ iniciarSesion: iniciar }), store: fakeStore() });
    expect(await login(' ', '123')).toEqual({ ok: false, error: 'Escribe tu usuario.' });
    expect(await login('x', ' ')).toEqual({ ok: false, error: 'Escribe tu clave.' });
    expect(iniciar).not.toHaveBeenCalled();
  });

  it('muestra el mensaje de la API (intentos restantes, bloqueo) y no guarda nada', async () => {
    const store = fakeStore();
    const api = fakeApi({ iniciarSesion: () => Promise.resolve(http(401, { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Usuario o clave incorrectos. Te quedan 3 intentos.' })) });
    const r = await crearIniciarSesion({ api, store })('x', 'y');
    expect(r).toEqual({ ok: false, error: 'Usuario o clave incorrectos. Te quedan 3 intentos.' });
    expect(store.guardar).not.toHaveBeenCalled();
  });

  it('sin señal da un mensaje claro', async () => {
    const api = fakeApi({ iniciarSesion: () => Promise.resolve(err({ kind: 'NETWORK' as const })) });
    const r = await crearIniciarSesion({ api, store: fakeStore() })('x', 'y');
    expect(!r.ok && r.error).toContain('Sin conexión');
  });
});

describe('restaurarSesion', () => {
  const yo = { ...USUARIO, empresaId: 'e1' };

  it('sin tokens guardados no hay sesión ni se llama a la API', async () => {
    const api = fakeApi();
    expect(await crearRestaurarSesion({ api, store: fakeStore() })()).toEqual({ tipo: 'sin_sesion' });
  });

  it('con tokens válidos devuelve al usuario', async () => {
    const api = fakeApi({ yo: () => Promise.resolve(ok(yo)) });
    expect(await crearRestaurarSesion({ api, store: fakeStore(TOKENS) })()).toEqual({ tipo: 'sesion', usuario: USUARIO });
  });

  it.each([401, 403])('un %i del servidor descarta la sesión guardada', async (status) => {
    const store = fakeStore(TOKENS);
    const api = fakeApi({ yo: () => Promise.resolve(http(status)) });
    expect(await crearRestaurarSesion({ api, store })()).toEqual({ tipo: 'sin_sesion' });
    expect(store.borrar).toHaveBeenCalled();
  });

  it('sin señal CONSERVA la sesión (el chofer trabaja sin conexión)', async () => {
    const store = fakeStore(TOKENS);
    const api = fakeApi({ yo: () => Promise.resolve(err({ kind: 'NETWORK' as const })) });
    expect(await crearRestaurarSesion({ api, store })()).toEqual({ tipo: 'sin_conexion' });
    expect(store.borrar).not.toHaveBeenCalled();
  });

  it('un error 5xx tampoco cierra la sesión', async () => {
    const store = fakeStore(TOKENS);
    expect(await crearRestaurarSesion({ api: fakeApi({ yo: () => Promise.resolve(http(502)) }), store })()).toEqual({ tipo: 'sin_conexion' });
    expect(store.borrar).not.toHaveBeenCalled();
  });

  it('cerrarSesion borra los tokens', () => {
    const store = fakeStore(TOKENS);
    crearCerrarSesion({ store })();
    expect(store.cargar()).toBeUndefined();
  });
});
