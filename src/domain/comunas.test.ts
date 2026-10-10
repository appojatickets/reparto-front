import { describe, expect, it } from 'vitest';
import { COMUNAS_RM, comunaDeDireccionOsm, comunaDistintaDelPin, separarComuna } from './comunas';

describe('COMUNAS_RM', () => {
  it('son las 52 comunas, sin repetidas y en orden alfabético para el selector', () => {
    expect(COMUNAS_RM).toHaveLength(52);
    expect(new Set(COMUNAS_RM).size).toBe(52);
    expect([...COMUNAS_RM].sort((a, b) => a.localeCompare(b, 'es'))).toEqual(COMUNAS_RM);
  });
});

describe('separarComuna', () => {
  it('separa la comuna del final y deja el resto como dirección', () => {
    expect(separarComuna('Av. Colón 765 San Bernardo')).toEqual({ consulta: 'Av. Colón 765', comuna: 'San Bernardo' });
    expect(separarComuna('kennedy 5413 las condes')).toEqual({ consulta: 'kennedy 5413', comuna: 'Las Condes' });
    expect(separarComuna('Calle El Maitén 052, Puente Alto')).toEqual({ consulta: 'Calle El Maitén 052', comuna: 'Puente Alto' });
  });

  it('ignora tildes, ñ y mayúsculas del dictado', () => {
    expect(separarComuna('Irarrázaval 3000 nunoa')).toEqual({ consulta: 'Irarrázaval 3000', comuna: 'Ñuñoa' });
    expect(separarComuna('Pajaritos 3030 MAIPU')).toEqual({ consulta: 'Pajaritos 3030', comuna: 'Maipú' });
  });

  it('prefiere la comuna más larga («San José de Maipo», no «Maipo»)', () => {
    expect(separarComuna('Camino 100 San José de Maipo')).toEqual({ consulta: 'Camino 100', comuna: 'San José de Maipo' });
  });

  it('una calle con nombre de comuna no se toma por la comuna si no está al final', () => {
    expect(separarComuna('Av. Providencia 2500')).toEqual({ consulta: 'Av. Providencia 2500' });
    expect(separarComuna('Providencia 2500 Providencia')).toEqual({ consulta: 'Providencia 2500', comuna: 'Providencia' });
  });

  it('no deja el texto vacío: si todo es el nombre de una comuna, no se separa', () => {
    expect(separarComuna('Santiago')).toEqual({ consulta: 'Santiago' });
    expect(separarComuna('  ')).toEqual({ consulta: '' });
  });

  it('sin comuna devuelve el texto tal cual (espacios simples)', () => {
    expect(separarComuna('minimarket   rabet')).toEqual({ consulta: 'minimarket rabet' });
  });
});

describe('comunaDeDireccionOsm', () => {
  it('prefiere el municipio y descarta lo que no es una comuna de la Región Metropolitana', () => {
    expect(comunaDeDireccionOsm({ village: 'Hospital', municipality: 'Paine', county: 'Provincia de Maipo' })).toBe('Paine');
    expect(comunaDeDireccionOsm({ city: 'Peñaflor', state: 'Región Metropolitana de Santiago' })).toBe('Peñaflor');
    expect(comunaDeDireccionOsm({ municipality: 'Comuna de San Bernardo' })).toBe('San Bernardo');
    expect(comunaDeDireccionOsm({ municipality: 'Quilpué', county: 'Valparaíso' })).toBeUndefined();
    expect(comunaDeDireccionOsm({})).toBeUndefined();
  });
});

describe('comunaDistintaDelPin', () => {
  it('avisa cuando el pin está claramente en otra comuna que la escrita', () => {
    // El centro de Puente Alto escrito como Maipú.
    expect(comunaDistintaDelPin('Maipú', -33.61, -70.58)).toBe('Puente Alto');
    expect(comunaDistintaDelPin('Providencia', -33.6, -70.7)).toBe('San Bernardo');
  });

  it('si el pin está en la comuna escrita, o cerca de su centro, no dice nada', () => {
    expect(comunaDistintaDelPin('Puente Alto', -33.61, -70.58)).toBeUndefined();
    expect(comunaDistintaDelPin('Maipú', -33.51, -70.76)).toBeUndefined();
  });

  it('un punto entre dos comunas (sin una clara) no se discute', () => {
    expect(comunaDistintaDelPin('Santiago', -33.475, -70.655)).toBeUndefined();
  });

  it('una comuna que no se conoce no genera aviso', () => {
    expect(comunaDistintaDelPin('Narnia', -33.45, -70.66)).toBeUndefined();
  });
});
