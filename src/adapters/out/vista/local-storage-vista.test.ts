import { describe, expect, it } from 'vitest';
import { crearVistaStore } from './local-storage-vista';

const almacenFalso = (inicial?: string) => {
  const datos = new Map<string, string>(inicial ? [['reparto.vista.v1', inicial]] : []);
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => { datos.set(k, v); } };
};

describe('vista guardada en el teléfono', () => {
  it('sin elección previa no hay vista; guarda y recuerda', () => {
    const almacen = almacenFalso();
    const store = crearVistaStore(almacen);
    expect(store.cargar()).toBeUndefined();
    store.guardar('normal');
    expect(store.cargar()).toBe('normal');
    expect(crearVistaStore(almacen).cargar()).toBe('normal');
  });

  it('ignora valores raros guardados', () => {
    expect(crearVistaStore(almacenFalso('enorme')).cargar()).toBeUndefined();
  });

  it('si el almacenamiento falla, igual la recuerda en memoria', () => {
    const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    const store = crearVistaStore(roto);
    store.guardar('grande');
    expect(store.cargar()).toBe('grande');
  });

  it('sin almacenamiento disponible funciona en memoria', () => {
    const store = crearVistaStore(undefined);
    expect(store.cargar()).toBeUndefined();
    store.guardar('normal');
    expect(store.cargar()).toBe('normal');
  });
});
