import { describe, expect, it } from 'vitest';
import { crearArmadoStore } from './local-storage-armado';

const almacenFalso = (inicial?: string) => {
  const datos = new Map<string, string>(inicial ? [['reparto.armado.v1', inicial]] : []);
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => { datos.set(k, v); } };
};

describe('forma de armar la ruta guardada en el teléfono', () => {
  it('sin elección previa no hay armado; guarda y recuerda', () => {
    const almacen = almacenFalso();
    const store = crearArmadoStore(almacen);
    expect(store.cargar()).toBeUndefined();
    store.guardar('carga');
    expect(store.cargar()).toBe('carga');
    expect(crearArmadoStore(almacen).cargar()).toBe('carga');
  });

  it('ignora valores raros guardados', () => {
    expect(crearArmadoStore(almacenFalso('al azar')).cargar()).toBeUndefined();
  });

  it('si el almacenamiento falla, igual la recuerda en memoria', () => {
    const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    const store = crearArmadoStore(roto);
    store.guardar('calcular');
    expect(store.cargar()).toBe('calcular');
  });

  it('sin almacenamiento disponible funciona en memoria', () => {
    const store = crearArmadoStore(undefined);
    expect(store.cargar()).toBeUndefined();
    store.guardar('carga');
    expect(store.cargar()).toBe('carga');
  });
});
