import { describe, expect, it } from 'vitest';
import { crearExportacionStore } from './local-storage-exportacion';

const almacenFalso = (inicial?: string) => {
  let valor = inicial;
  return { getItem: () => valor ?? null, setItem: (_k: string, v: string) => { valor = v; } };
};

describe('preferencias de exportación', () => {
  it('guarda y recupera las columnas y el formato', () => {
    const almacen = almacenFalso();
    crearExportacionStore(almacen).guardar({ columnas: ['rut', 'comuna'], formato: 'estandar' });
    expect(crearExportacionStore(almacen).cargar()).toEqual({ columnas: ['rut', 'comuna'], formato: 'estandar' });
  });

  it('ignora lo guardado que no sirve (texto roto, columnas que ya no existen, formato desconocido)', () => {
    expect(crearExportacionStore(almacenFalso('no es json')).cargar()).toBeUndefined();
    expect(crearExportacionStore(almacenFalso(JSON.stringify({ columnas: ['otra'], formato: 'excel' }))).cargar()).toBeUndefined();
    expect(crearExportacionStore(almacenFalso(JSON.stringify({ columnas: ['rut'], formato: 'xml' }))).cargar()).toBeUndefined();
    expect(crearExportacionStore(almacenFalso(JSON.stringify({ columnas: ['rut', 'otra'], formato: 'excel' }))).cargar()).toEqual({ columnas: ['rut'], formato: 'excel' });
  });

  it('si el almacenamiento falla, lo recuerda mientras la app esté abierta', () => {
    const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    const store = crearExportacionStore(roto);
    store.guardar({ columnas: ['nota'], formato: 'excel' });
    expect(store.cargar()).toEqual({ columnas: ['nota'], formato: 'excel' });
  });
});
