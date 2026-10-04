import { describe, expect, it } from 'vitest';
import { leerCoordenadas, textoCoordenadas } from './coordenadas';

describe('leerCoordenadas', () => {
  it('lee lo que copia Google Maps (coma y espacio)', () => {
    expect(leerCoordenadas('-33.4372, -70.6506')).toEqual({ lat: -33.4372, lng: -70.6506 });
    expect(leerCoordenadas('  -33.4372,-70.6506 ')).toEqual({ lat: -33.4372, lng: -70.6506 });
  });
  it('acepta espacio como separador y coma decimal', () => {
    expect(leerCoordenadas('-33.4372 -70.6506')).toEqual({ lat: -33.4372, lng: -70.6506 });
    expect(leerCoordenadas('-33,4372 -70,6506')).toEqual({ lat: -33.4372, lng: -70.6506 });
  });
  it('rechaza texto sin dos números, o fuera de la Región Metropolitana', () => {
    for (const t of ['', 'Providencia', '-33.4', '-33.4, -70.6, 3', '-41.47, -72.94', '33.4372, 70.6506']) expect(leerCoordenadas(t)).toBeUndefined();
  });
  it('ida y vuelta', () => {
    expect(leerCoordenadas(textoCoordenadas({ lat: -33.45, lng: -70.66 }))).toEqual({ lat: -33.45, lng: -70.66 });
  });
});
