import { describe, expect, it } from 'vitest';
import { accionesDe, puedeHacer } from './rol';

describe('acciones por rol (solo para mostrar el menú; la API es quien manda)', () => {
  it('el chofer solo ve su ruta', () => {
    expect(accionesDe('chofer')).toEqual(['mi-ruta']);
  });

  it('el despachador ve clientes y pines, pero no usuarios ni importación', () => {
    expect(accionesDe('despachador')).toEqual(['buscar-clientes', 'cliente-nuevo', 'revisar-pines']);
    expect(puedeHacer('despachador', 'usuarios')).toBe(false);
    expect(puedeHacer('despachador', 'importar-clientes')).toBe(false);
  });

  it('el admin ve todo', () => {
    expect(puedeHacer('admin', 'usuarios')).toBe(true);
    expect(puedeHacer('admin', 'importar-clientes')).toBe(true);
    expect(puedeHacer('admin', 'revisar-pines')).toBe(true);
    expect(puedeHacer('admin', 'mi-ruta')).toBe(false); // el admin no maneja un camión
  });
});
