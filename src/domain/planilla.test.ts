import { describe, expect, it } from 'vitest';
import { leerCeldaVendedores, leerComunas, leerPlanilla } from './planilla';

describe('celda de vendedores', () => {
  it('uno o varios, con nombre, separados por guion', () => {
    expect(leerCeldaVendedores('V12 Mario Quiroz- V13 Oscar baeza')).toEqual([{ codigo: 'V12', nombre: 'Mario Quiroz' }, { codigo: 'V13', nombre: 'Oscar baeza' }]);
    expect(leerCeldaVendedores('V03 Roberto del Rio - V07 Dario maldonado - V09 Luis budin')).toEqual([
      { codigo: 'V03', nombre: 'Roberto del Rio' }, { codigo: 'V07', nombre: 'Dario maldonado' }, { codigo: 'V09', nombre: 'Luis budin' },
    ]);
  });
  it('solo el código, con comas o sin separador, y el código se escribe igual (v6 → V06)', () => {
    expect(leerCeldaVendedores('V14')).toEqual([{ codigo: 'V14' }]);
    expect(leerCeldaVendedores('V05, V16')).toEqual([{ codigo: 'V05' }, { codigo: 'V16' }]);
    expect(leerCeldaVendedores('v6 Pedro v2 Juan')).toEqual([{ codigo: 'V06', nombre: 'Pedro' }, { codigo: 'V02', nombre: 'Juan' }]);
  });
  it('vacío, guion o sin código no tiene vendedores', () => {
    expect(leerCeldaVendedores('')).toEqual([]);
    expect(leerCeldaVendedores(' - ')).toEqual([]);
    expect(leerCeldaVendedores('sin vendedor')).toEqual([]);
  });
});

describe('celda de comunas', () => {
  it('separa por coma, punto y coma, barra o «y», sin repetir ni dejar vacíos', () => {
    expect(leerComunas('Maipú, Pudahuel')).toEqual(['Maipú', 'Pudahuel']);
    expect(leerComunas('Maipú / Pudahuel ; Lampa')).toEqual(['Maipú', 'Pudahuel', 'Lampa']);
    expect(leerComunas('La Florida y Puente Alto')).toEqual(['La Florida', 'Puente Alto']);
    expect(leerComunas('Maipú, maipú, ')).toEqual(['Maipú']);
    expect(leerComunas('')).toEqual([]);
    expect(leerComunas('-')).toEqual([]);
  });
});

describe('planilla pegada desde Excel', () => {
  const tabla = [
    ['Chofer', 'Ayudante', 'Camión', 'Vendedor'],
    ['Juan Pérez', 'Pedro Gómez', 'SDTS23', 'V12 Mario Quiroz - V13 Oscar Baeza'],
    ['Luis Rojas', '', 'LZYS-23', 'V14'],
  ].map((f) => f.join('\t')).join('\n');

  it('lee chofer, ayudante, camión y vendedores por el nombre de la columna', () => {
    const r = leerPlanilla(tabla);
    expect(r.faltantes).toEqual([]);
    expect(r.filas).toEqual([
      { patente: 'SDTS23', chofer: 'Juan Pérez', ayudante: 'Pedro Gómez', vendedores: [{ codigo: 'V12', nombre: 'Mario Quiroz' }, { codigo: 'V13', nombre: 'Oscar Baeza' }] },
      { patente: 'LZYS23', chofer: 'Luis Rojas', vendedores: [{ codigo: 'V14' }] },
    ]);
  });

  it('acepta otros nombres de columna, en cualquier orden y con comunas', () => {
    const r = leerPlanilla(['PATENTE\tCOMUNAS\tVENDEDORES\tCONDUCTOR', 'ab 12 34\tMaipú, Lampa\tV01\tAna Soto'].join('\n'));
    expect(r.filas).toEqual([{ patente: 'AB1234', chofer: 'Ana Soto', vendedores: [{ codigo: 'V01' }], comunas: ['Maipú', 'Lampa'] }]);
  });

  it('las filas sin patente se saltan y los guiones cuentan como vacío', () => {
    const r = leerPlanilla(['Chofer\tAyudante\tCamión\tVendedor', 'Juan Pérez\t-\t\tV01', 'Luis Rojas\t-\tABCD12\t-'].join('\n'));
    expect(r.filas).toEqual([{ patente: 'ABCD12', chofer: 'Luis Rojas', vendedores: [] }]);
  });

  it('CABINET entrega las máquinas, no los helados: se omite y se informa, sin tratarlo como camión', () => {
    const r = leerPlanilla(['Chofer\tCamión\tVendedor', 'Juan\tCABINET\tV01', 'Luis Rojas\tABCD12\tV02', 'Ana\tcabinet \t'].join('\n'));
    expect(r.filas.map((f) => f.patente)).toEqual(['ABCD12']);
    expect(r.omitidas).toEqual(['CABINET']);
  });

  it('un vehículo que no es patente ni CABINET se manda igual: la API avisa que no es una patente', () => {
    const r = leerPlanilla(['Chofer\tCamión', 'Juan\tXYZ'].join('\n'));
    expect(r.filas[0]?.patente).toBe('XYZ');
    expect(r.omitidas).toEqual([]);
  });

  it('sin columna de camión o patente avisa qué falta; las columnas que no usa se informan', () => {
    const r = leerPlanilla(['Chofer\tRuta\tObs', 'Juan\t3\tx'].join('\n'));
    expect(r.faltantes).toEqual(['camion']);
    expect(r.ignoradas).toEqual(['Ruta', 'Obs']);
    expect(r.filas).toEqual([]);
  });

  it('un texto vacío no tiene filas ni falta nada que avisar de más', () => {
    expect(leerPlanilla('   ').filas).toEqual([]);
  });
});
