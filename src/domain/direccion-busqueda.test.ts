import { describe, expect, it } from 'vitest';
import { direccionParaBuscar } from './direccion-busqueda';

describe('dirección lista para buscar en un mapa', () => {
  it.each([
    ['Camino Santa Rita Parcela Nº 4', 'Camino Santa Rita'],
    ['Calle Alameda 114', 'Calle Alameda 114'],
    ['Av. Irarrazabal S/N', 'Avenida Irarrazabal'],
    ['AV COLON SUR 765', 'Avenida COLON SUR 765'],
    ['Cam. Padre Hurtado 31280', 'Camino Padre Hurtado 31280'],
    ['La Romana Sitio 32 Chada', 'La Romana Chada'],
    ['21 de Mayo 4548 Loc. B', '21 de Mayo 4548'],
  ])('«%s» → «%s»', (entrada, esperado) => {
    expect(direccionParaBuscar(entrada)).toBe(esperado);
  });

  it.each(['', 'Sin dirección', 'Ubicación en el mapa (-33.7, -70.9)', 'Parcela 4 Sitio 2', 'S/N'])('no hay nada que buscar en «%s»', (entrada) => {
    expect(direccionParaBuscar(entrada)).toBeUndefined();
  });
});
