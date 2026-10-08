import { describe, expect, it } from 'vitest';
import { accionesDe, esDeCamion, puedeEditar, puedeHacer } from './rol';

describe('acciones por rol (solo para mostrar el menú; la API es quien manda)', () => {
  it('el chofer solo ve su ruta', () => {
    expect(accionesDe('chofer')).toEqual(['mi-ruta', 'cargar-facturas']);
  });

  it('el despachador ve clientes y pines, pero no usuarios ni importación', () => {
    expect(accionesDe('despachador')).toEqual(['facturas', 'rutas', 'buscar-clientes', 'cliente-nuevo', 'locales', 'verificar-pines', 'revisar-pines', 'reportes']);
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

  it('un chofer o ayudante con permiso de editor puede buscar clientes y corregir direcciones; sin el permiso, no', () => {
    expect(puedeHacer('chofer', 'buscar-clientes')).toBe(false);
    expect(puedeHacer('chofer', 'buscar-clientes', true)).toBe(true);
    expect(puedeHacer('ayudante', 'buscar-clientes', true)).toBe(true);
    expect(accionesDe('chofer', true)).toEqual(['mi-ruta', 'cargar-facturas', 'buscar-clientes', 'verificar-pines', 'locales']);
    expect(puedeHacer('chofer', 'verificar-pines')).toBe(false);
    expect(puedeHacer('chofer', 'revisar-pines', true)).toBe(false);
    expect(accionesDe('chofer', false)).toEqual(['mi-ruta', 'cargar-facturas']);
    expect(puedeHacer('chofer', 'usuarios', true)).toBe(false);
    expect(puedeHacer('chofer', 'fotos', true)).toBe(false);
  });

  it('puedeEditar: admin y despachador siempre; chofer y ayudante solo con el permiso', () => {
    expect(puedeEditar('admin', false)).toBe(true);
    expect(puedeEditar('despachador', false)).toBe(true);
    expect(puedeEditar('chofer', false)).toBe(false);
    expect(puedeEditar('chofer', true)).toBe(true);
    expect(puedeEditar('ayudante', true)).toBe(true);
    expect(puedeEditar('ayudante', false)).toBe(false);
  });

  it('la sección LOCALES (por comuna, con edición) la ven admin, despachador y el chofer o ayudante editor; no el chofer común', () => {
    expect(puedeHacer('admin', 'locales')).toBe(true);
    expect(puedeHacer('despachador', 'locales')).toBe(true);
    expect(puedeHacer('chofer', 'locales')).toBe(false);
    expect(puedeHacer('chofer', 'locales', true)).toBe(true);
    expect(puedeHacer('ayudante', 'locales', true)).toBe(true);
  });
});
