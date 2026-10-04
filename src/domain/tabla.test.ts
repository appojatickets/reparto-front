import { describe, expect, it } from 'vitest';
import { mapearClientes, mapearPines, parsearTabla } from './tabla';

describe('parsearTabla', () => {
  it('lee TSV pegado desde Excel', () => {
    const t = parsearTabla('Rut\tRazón Social\tComuna\n12.345.678-5\tRabelo Mágica SpA\tProvidencia\n');
    expect(t.encabezados).toEqual(['Rut', 'Razón Social', 'Comuna']);
    expect(t.filas).toEqual([['12.345.678-5', 'Rabelo Mágica SpA', 'Providencia']]);
  });

  it('detecta punto y coma (Excel en español) y coma', () => {
    expect(parsearTabla('a;b;c\n1;2;3').filas).toEqual([['1', '2', '3']]);
    expect(parsearTabla('a,b,c\n1,2,3').filas).toEqual([['1', '2', '3']]);
  });

  it('respeta comillas: delimitadores, comillas dobles escapadas y saltos de línea dentro de un campo', () => {
    const t = parsearTabla('nombre;direccion\n"Kiosko ""El Sol"""; "Av. A, 123"\n"Con\nsalto";x');
    expect(t.filas).toEqual([['Kiosko "El Sol"', 'Av. A, 123'], ['Con\nsalto', 'x']]);
  });

  it('ignora BOM, líneas vacías y fin de línea de Windows; recorta espacios', () => {
    const t = parsearTabla('﻿a;b\r\n\r\n  1 ; 2 \r\n');
    expect(t.encabezados).toEqual(['a', 'b']);
    expect(t.filas).toEqual([['1', '2']]);
  });

  it('texto vacío da una tabla vacía', () => {
    expect(parsearTabla('  \n ')).toEqual({ encabezados: [], filas: [] });
  });

  it('completa con vacíos las filas más cortas que el encabezado', () => {
    expect(parsearTabla('a;b;c\n1;2').filas).toEqual([['1', '2', '']]);
  });
});

describe('mapearClientes', () => {
  it('reconoce los encabezados habituales, con tildes, mayúsculas y sinónimos', () => {
    const t = parsearTabla('RUT;Razón Social;Giro;Dirección;Comuna;Latitud;Longitud;Observaciones\n12.345.678-5;Rabelo SpA;Minimarket;Av. X 1;Maipú;-33.5;-70.7;portón verde');
    const m = mapearClientes(t);
    expect(m.faltantes).toEqual([]);
    expect(m.filas).toEqual([{ rut: '12.345.678-5', razonSocial: 'Rabelo SpA', giro: 'Minimarket', direccion: 'Av. X 1', comuna: 'Maipú', lat: '-33.5', lng: '-70.7', nota: 'portón verde' }]);
  });

  it('informa las columnas que no reconoce y las que faltan', () => {
    const m = mapearClientes(parsearTabla('Nombre;Teléfono;Calle\nKiosko;123;Calle 1'));
    expect(m.ignoradas).toEqual(['Teléfono']);
    expect(m.faltantes).toEqual(['comuna']);
    expect(m.filas[0]).toEqual({ razonSocial: 'Kiosko', direccion: 'Calle 1' });
  });

  it('las celdas vacías no generan campo', () => {
    const m = mapearClientes(parsearTabla('rut;nombre;direccion;comuna\n;Kiosko;Calle 1;Maipú'));
    expect(m.filas[0]).toEqual({ razonSocial: 'Kiosko', direccion: 'Calle 1', comuna: 'Maipú' });
  });

  it('si dos columnas apuntan al mismo campo, gana la primera', () => {
    const m = mapearClientes(parsearTabla('nombre;cliente;direccion;comuna\nA;B;C;Maipú'));
    expect(m.filas[0]?.razonSocial).toBe('A');
    expect(m.ignoradas).toEqual(['cliente']);
  });

  it('una tabla vacía lo declara todo faltante', () => {
    expect(mapearClientes({ encabezados: [], filas: [] }).faltantes).toEqual(['razonSocial', 'direccion', 'comuna']);
  });
});

describe('mapearPines', () => {
  it('reconoce RUT, dirección, latitud y longitud con sus sinónimos', () => {
    const m = mapearPines(parsearTabla('Rut;Domicilio;Latitud;Lon;Chofer\n12.345.678-5;Av. X 1;-33,5;-70,7;Juan'));
    expect(m.pines).toEqual([{ rut: '12.345.678-5', direccion: 'Av. X 1', lat: '-33,5', lng: '-70,7' }]);
    expect(m.ignoradas).toEqual(['Chofer']);
    expect(m.faltantes).toEqual([]);
  });

  it('informa lo que falta', () => {
    expect(mapearPines(parsearTabla('direccion\nCalle 1')).faltantes).toEqual(['lat', 'lng']);
  });
});
