import { describe, expect, it } from 'vitest';
import { crearHorasStore } from './local-storage-horas';

const almacenFalso = (inicial?: string) => {
  const datos = new Map<string, string>(inicial ? [['reparto.horas.v1', inicial]] : []);
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => { datos.set(k, v); } };
};

describe('ver las horas estimadas, guardado en el teléfono', () => {
  it('por defecto no se ven; guarda y recuerda la elección', () => {
    const almacen = almacenFalso();
    const store = crearHorasStore(almacen);
    expect(store.cargar()).toBe(false);
    store.guardar(true);
    expect(store.cargar()).toBe(true);
    expect(crearHorasStore(almacen).cargar()).toBe(true);
    store.guardar(false);
    expect(crearHorasStore(almacen).cargar()).toBe(false);
  });

  it('ignora valores raros guardados', () => {
    expect(crearHorasStore(almacenFalso('quizás')).cargar()).toBe(false);
  });

  it('si el almacenamiento falla o no existe, la recuerda en memoria', () => {
    const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    const store = crearHorasStore(roto);
    store.guardar(true);
    expect(store.cargar()).toBe(true);
    const sin = crearHorasStore(undefined);
    expect(sin.cargar()).toBe(false);
    sin.guardar(true);
    expect(sin.cargar()).toBe(true);
  });
});
