import { describe, expect, it } from 'vitest';
import { crearTemaStore } from './local-storage-tema';

const almacenFalso = (inicial?: string) => {
  const datos = new Map<string, string>(inicial ? [['reparto.tema.v1', inicial]] : []);
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => { datos.set(k, v); } };
};

describe('tema guardado en el teléfono', () => {
  it('sin elección previa no hay tema; guarda y recuerda', () => {
    const almacen = almacenFalso();
    const store = crearTemaStore(almacen);
    expect(store.cargar()).toBeUndefined();
    store.guardar('oscuro');
    expect(store.cargar()).toBe('oscuro');
    expect(crearTemaStore(almacen).cargar()).toBe('oscuro');
  });

  it('ignora valores raros guardados', () => {
    expect(crearTemaStore(almacenFalso('violeta')).cargar()).toBeUndefined();
  });

  it('si el almacenamiento falla, igual lo recuerda en memoria', () => {
    const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    const store = crearTemaStore(roto);
    store.guardar('claro');
    expect(store.cargar()).toBe('claro');
  });
});
