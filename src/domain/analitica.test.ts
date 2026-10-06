import { describe, expect, it } from 'vitest';
import { aQuienAplica, diferenciaPromedio, kilometros, nivelDeConfianza, proporcion, textoDeDiferencia, textoDeHoras, textoDeRitmo } from './analitica';

describe('lectura de la analítica', () => {
  it('proporción con porcentaje y guion si no hay base', () => {
    expect(proporcion(32, 40)).toBe('32 de 40 (80 %)');
    expect(proporcion(0, 0)).toBe('—');
  });

  it('confianza en palabras', () => {
    expect([0.1, 0.4, 0.9].map(nivelDeConfianza)).toEqual(['baja', 'media', 'alta']);
  });

  it('a quién aplica lo aprendido', () => {
    expect(aQuienAplica({ ambito: 'global' })).toBe('Todos los camiones');
    expect(aQuienAplica({ ambito: 'camion:abc', camion: 'LRST·81' })).toBe('Camión LRST·81');
    expect(aQuienAplica({ ambito: 'comuna:Buin' })).toBe('Hacia Buin');
  });

  it('el ritmo se dice en porcentaje, sin mostrar horas', () => {
    expect(textoDeRitmo(1.2)).toBe('20 % más lento que lo calculado');
    expect(textoDeRitmo(0.9)).toBe('10 % más rápido que lo calculado');
    expect(textoDeRitmo(1.01)).toBe('como lo calculado');
  });

  it('kilómetros con coma', () => {
    expect(kilometros(12_340)).toBe('12,3 km');
  });

  it('la diferencia promedio entre lo manejado y lo sugerido', () => {
    expect(diferenciaPromedio([])).toBeUndefined();
    const d = diferenciaPromedio([{ distSugeridaM: 10_000, distRealM: 11_000 }, { distSugeridaM: 20_000, distRealM: 20_000 }]);
    expect(d).toBeCloseTo(0.05, 5);
    expect(textoDeDiferencia(0.05)).toBe('Lo manejado fue 5 % más largo que lo sugerido.');
    expect(textoDeDiferencia(-0.1)).toBe('Lo manejado fue 10 % más corto que lo sugerido.');
    expect(textoDeDiferencia(0)).toBe('Lo manejado fue igual de largo que lo sugerido.');
  });

  it('horas', () => {
    expect(textoDeHoras([9, 14])).toBe('09:00, 14:00');
  });
});
