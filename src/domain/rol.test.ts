import { describe, expect, it } from 'vitest';
import { accionesDe, esDeCamion, puedeHacer } from './rol';

describe('acciones por rol (solo para mostrar el menú; la API es quien manda)', () => {
  it('el chofer solo ve su ruta', () => {
    expect(accionesDe('chofer')).toEqual(['mi-ruta', 'cargar-facturas']);
  });

  it('el despachador ve clientes y pines, pero no usuarios ni importación', () => {
    expect(accionesDe('despachador')).toEqual(['facturas', 'rutas', 'buscar-clientes', 'cliente-nuevo', 'revisar-pines']);
    expect(puedeHacer('despachador', 'usuarios')).toBe(false);
    expect(puedeHacer('despachador', 'camiones')).toBe(false);
    expect(puedeHacer('despachador', 'configuracion')).toBe(false);
    expect(puedeHacer('despachador', 'importar-clientes')).toBe(false);
  });

  it('el admin ve todo', () => {
    expect(puedeHacer('admin', 'usuarios')).toBe(true);
    expect(puedeHacer('admin', 'importar-clientes')).toBe(true);
    expect(puedeHacer('admin', 'camiones')).toBe(true);
    expect(puedeHacer('admin', 'vendedores')).toBe(true);
    expect(puedeHacer('despachador', 'vendedores')).toBe(false);
    expect(puedeHacer('admin', 'configuracion')).toBe(true);
    expect(puedeHacer('admin', 'rutas')).toBe(true);
    expect(puedeHacer('admin', 'facturas')).toBe(true);
    expect(puedeHacer('admin', 'revisar-pines')).toBe(true);
    expect(puedeHacer('admin', 'mi-ruta')).toBe(false); // el admin no maneja un camión
  });

  it('el ayudante ve lo mismo que el chofer (va en el mismo camión)', () => {
    expect(accionesDe('ayudante')).toEqual(accionesDe('chofer'));
    expect(esDeCamion('ayudante')).toBe(true);
    expect(esDeCamion('chofer')).toBe(true);
    expect(esDeCamion('despachador')).toBe(false);
    expect(esDeCamion('admin')).toBe(false);
  });
});
