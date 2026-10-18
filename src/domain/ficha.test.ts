import { describe, expect, it } from 'vitest';
import { ES_POCA_EVIDENCIA, franjasDeCierre, nombreDelDia, textoDeRango, type FichaAprendida } from './ficha';

const base: FichaAprendida = { visitas: 8, entregas: 6, cerrados: 2, confianza: 0.44, porDiaSemana: [], franjas: [] };

describe('ficha aprendida en lenguaje simple', () => {
  it('dice el rango en que se entrega y lo más común', () => {
    expect(textoDeRango({ desdeMin: 620, hastaMin: 700, medianaMin: 660, entregas: 6 })).toBe('entre las 10:20 y las 11:40 (lo más común: 11:00)');
    expect(textoDeRango({ desdeMin: 540, hastaMin: 540, medianaMin: 540, entregas: 3 })).toBe('a las 09:00');
  });

  it('los días van de domingo a sábado', () => {
    expect([0, 1, 5, 6].map(nombreDelDia)).toEqual(['domingo', 'lunes', 'viernes', 'sábado']);
  });

  it('lista solo las franjas con cierres y al menos 2 visitas, las más probables primero', () => {
    const f: FichaAprendida = { ...base, franjas: [
      { desdeHora: 10, hastaHora: 12, visitas: 3, cerrados: 0, pCerrado: 0.2 },
      { desdeHora: 12, hastaHora: 14, visitas: 3, cerrados: 2, pCerrado: 0.6 },
      { desdeHora: 14, hastaHora: 16, visitas: 1, cerrados: 1, pCerrado: 0.67 },
      { desdeHora: 16, hastaHora: 18, visitas: 4, cerrados: 3, pCerrado: 0.67 },
    ] };
    expect(franjasDeCierre(f).map((x) => x.texto)).toEqual(['de 16:00 a 18:00', 'de 12:00 a 14:00']);
  });

  it('con menos de 5 visitas es poca evidencia', () => {
    expect(ES_POCA_EVIDENCIA({ ...base, visitas: 4 })).toBe(true);
    expect(ES_POCA_EVIDENCIA(base)).toBe(false);
  });
});
