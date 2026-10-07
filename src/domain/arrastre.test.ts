import { describe, expect, it } from 'vitest';
import { destinoDeArrastre, reordenarParadas, velocidadDeDesplazamiento } from './arrastre';

describe('destinoDeArrastre', () => {
  // Cuatro filas de 100 px apiladas; sus centros están en 50, 150, 250 y 350.
  const medios = [50, 150, 250, 350];

  it('sin moverse queda donde estaba', () => {
    for (const origen of [0, 1, 2, 3]) expect(destinoDeArrastre(medios, origen, medios[origen] ?? 0)).toBe(origen);
  });

  it('cambia de lugar al pasar el centro de la fila vecina, no antes', () => {
    expect(destinoDeArrastre(medios, 0, 149)).toBe(0);
    expect(destinoDeArrastre(medios, 0, 151)).toBe(1);
    expect(destinoDeArrastre(medios, 3, 151)).toBe(2);
    expect(destinoDeArrastre(medios, 3, 149)).toBe(1);
  });

  it('arrastrando lejos llega a los extremos', () => {
    expect(destinoDeArrastre(medios, 0, 5000)).toBe(3);
    expect(destinoDeArrastre(medios, 3, -5000)).toBe(0);
  });

  it('con filas de distinto alto usa los centros reales', () => {
    // Una fila alta (nombre en dos líneas) y dos bajas.
    expect(destinoDeArrastre([60, 190, 270], 0, 200)).toBe(1);
    expect(destinoDeArrastre([60, 190, 270], 0, 280)).toBe(2);
  });

  it('con una sola fila no hay a dónde ir', () => {
    expect(destinoDeArrastre([50], 0, 900)).toBe(0);
  });
});

describe('velocidadDeDesplazamiento', () => {
  it('en el medio de la pantalla no se desplaza', () => {
    expect(velocidadDeDesplazamiento(400, 800)).toBe(0);
  });

  it('cerca del borde de arriba sube y cerca del de abajo baja, más rápido mientras más cerca', () => {
    expect(velocidadDeDesplazamiento(10, 800)).toBeLessThan(velocidadDeDesplazamiento(80, 800));
    expect(velocidadDeDesplazamiento(10, 800)).toBeLessThan(0);
    expect(velocidadDeDesplazamiento(790, 800)).toBeGreaterThan(velocidadDeDesplazamiento(720, 800));
    expect(velocidadDeDesplazamiento(790, 800)).toBeGreaterThan(0);
  });

  it('nunca pasa de la velocidad máxima, ni siquiera fuera de la pantalla', () => {
    expect(velocidadDeDesplazamiento(-500, 800, 96, 18)).toBe(-18);
    expect(velocidadDeDesplazamiento(5000, 800, 96, 18)).toBe(18);
  });

  it('justo en el límite de la zona no se mueve (y nunca devuelve -0)', () => {
    expect(Object.is(velocidadDeDesplazamiento(96, 800), 0)).toBe(true);
    expect(Object.is(velocidadDeDesplazamiento(704, 800), 0)).toBe(true);
  });
});

describe('reordenarParadas', () => {
  const lista = ['A', 'B', 'C', 'D'].map((facturaId, posicion) => ({ facturaId, posicion, hora: 600 + posicion * 15 }));
  const ids = (l: readonly { facturaId: string }[]) => l.map((x) => x.facturaId);

  it('deja la parada en su nuevo lugar y renumera las posiciones', () => {
    const r = reordenarParadas(lista, 'A', 2);
    expect(ids(r)).toEqual(['B', 'C', 'A', 'D']);
    expect(r.map((x) => x.posicion)).toEqual([0, 1, 2, 3]);
  });

  it('conserva el resto de los datos de cada parada', () => {
    const r = reordenarParadas(lista, 'D', 0);
    expect(r[0]).toEqual({ facturaId: 'D', posicion: 0, hora: 645 });
  });

  it('acota la posición a los extremos y no cambia nada si la parada no está', () => {
    expect(ids(reordenarParadas(lista, 'A', 99))).toEqual(['B', 'C', 'D', 'A']);
    expect(ids(reordenarParadas(lista, 'D', -3))).toEqual(['D', 'A', 'B', 'C']);
    expect(reordenarParadas(lista, 'Z', 1)).toBe(lista);
  });

  it('no modifica la lista original', () => {
    reordenarParadas(lista, 'A', 3);
    expect(ids(lista)).toEqual(['A', 'B', 'C', 'D']);
  });
});
