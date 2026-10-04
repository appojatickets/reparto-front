import { describe, expect, it } from 'vitest';
import { leerNumeroHablado } from './numeros-es';

const leer = (t: string) => leerNumeroHablado(t.split(' '));

describe('leerNumeroHablado', () => {
  it('cardinales', () => {
    expect(leer('mil doscientos treinta y cuatro')).toEqual({ digitos: '1234', usados: 5 });
    expect(leer('siete mil uno')).toEqual({ digitos: '7001', usados: 3 });
    expect(leer('ciento cinco')).toEqual({ digitos: '105', usados: 2 });
    expect(leer('dos mil quinientos')).toEqual({ digitos: '2500', usados: 3 });
    expect(leer('novecientos noventa y nueve')).toEqual({ digitos: '999', usados: 4 });
    expect(leer('mil')).toEqual({ digitos: '1000', usados: 1 });
    expect(leer('veintitrés mil cuatrocientos')).toEqual({ digitos: '23400', usados: 3 });
    expect(leer('mil quince')).toEqual({ digitos: '1015', usados: 2 });
  });

  it('dígito por dígito', () => {
    expect(leer('siete cero cero uno')).toEqual({ digitos: '7001', usados: 4 });
    expect(leer('uno dos tres')).toEqual({ digitos: '123', usados: 3 });
  });

  it('se detiene donde empieza el nombre del cliente', () => {
    expect(leer('mil doscientos treinta y cuatro minimarket rabet')?.usados).toBe(5);
    expect(leer('siete cero cero uno plaza oeste')?.usados).toBe(4);
  });

  it('ignora tildes y mayúsculas', () => {
    expect(leer('Mil Quinientos Dieciséis')).toEqual({ digitos: '1516', usados: 3 });
  });

  it('no inventa números: combinaciones inválidas o menos de 3 cifras', () => {
    for (const t of ['dos hermanos', 'treinta cuatro cosas', 'siete cero', 'tres', 'minimarket mil', 'y tres']) expect(leer(t), t).toBeUndefined();
  });
});
