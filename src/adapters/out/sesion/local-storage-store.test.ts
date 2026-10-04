import { describe, expect, it } from 'vitest';
import { crearSesionStore } from './local-storage-store';

const almacenFalso = (inicial: Record<string, string> = {}) => {
  const datos = new Map(Object.entries(inicial));
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => { datos.set(k, v); },
    removeItem: (k: string) => { datos.delete(k); },
    datos,
  };
};
const T = { accessToken: 'a', refreshToken: 'r' };

describe('crearSesionStore', () => {
  it('guarda, carga y borra la sesión', () => {
    const a = almacenFalso();
    const s = crearSesionStore(a);
    expect(s.cargar()).toBeUndefined();
    s.guardar(T);
    expect(crearSesionStore(a).cargar()).toEqual(T); // sobrevive a recargar la app
    s.borrar();
    expect(crearSesionStore(a).cargar()).toBeUndefined();
  });

  it('ignora contenido corrupto o con otra forma', () => {
    expect(crearSesionStore(almacenFalso({ 'reparto.sesion.v1': 'no-json{' })).cargar()).toBeUndefined();
    expect(crearSesionStore(almacenFalso({ 'reparto.sesion.v1': '{"x":1}' })).cargar()).toBeUndefined();
  });

  it('si el almacenamiento falla (modo privado) sigue funcionando en memoria', () => {
    const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); }, removeItem: () => { throw new Error('bloqueado'); } };
    const s = crearSesionStore(roto);
    s.guardar(T);
    expect(s.cargar()).toEqual(T);
    s.borrar();
    expect(s.cargar()).toBeUndefined();
  });

  it('sin almacenamiento (undefined) también usa memoria', () => {
    const s = crearSesionStore(undefined);
    s.guardar(T);
    expect(s.cargar()).toEqual(T);
  });
});
