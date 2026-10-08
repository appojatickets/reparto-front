import { describe, expect, it } from 'vitest';
import { describirRespaldo } from './respaldo-pin';

describe('describirRespaldo', () => {
  it('sin entregas dice que todavía no hay nada que lo confirme', () => {
    expect(describirRespaldo({ nivel: 'sin_respaldo', entregas: 0, dias: 0 })).toEqual({
      etiqueta: 'PIN SIN RESPALDO',
      ayuda: 'Todavía no hay entregas que lo confirmen. Se va ajustando con el lugar donde se entrega.',
    });
  });

  it('con una entrega explica qué falta para respaldarlo', () => {
    const r = describirRespaldo({ nivel: 'sin_respaldo', entregas: 1, dias: 1 });
    expect(r.etiqueta).toBe('PIN SIN RESPALDO');
    expect(r.ayuda).toContain('1 entrega');
    expect(r.ayuda).toContain('con otra que coincida');
  });

  it('respaldado dice cuántas entregas coinciden y en cuántos días (singular y plural)', () => {
    expect(describirRespaldo({ nivel: 'respaldado', entregas: 3, dias: 2 })).toEqual({
      etiqueta: 'PIN RESPALDADO POR ENTREGAS',
      ayuda: '3 entregas, en 2 días, coinciden junto a este pin. Puedes verificarlo con confianza.',
    });
    expect(describirRespaldo({ nivel: 'respaldado', entregas: 2, dias: 2 }).ayuda).toContain('2 entregas, en 2 días');
  });

  it('en conflicto con entregas que coinciden lejos del pin dice a cuántos metros; si no coinciden entre sí, lo explica', () => {
    expect(describirRespaldo({ nivel: 'en_conflicto', entregas: 2, dias: 2, distanciaM: 445 })).toEqual({
      etiqueta: 'PIN EN CONFLICTO',
      ayuda: 'Las entregas coinciden a 445 m de este pin. Revisa dónde está el local.',
    });
    const dispersas = describirRespaldo({ nivel: 'en_conflicto', entregas: 1, dias: 1, distanciaM: 20 });
    expect(dispersas.ayuda).toBe('Las entregas se avisaron desde lugares distintos. Revisa dónde está el local.');
  });

  it('los metros se muestran en km desde 1.000 m', () => {
    expect(describirRespaldo({ nivel: 'en_conflicto', entregas: 2, dias: 2, distanciaM: 1650 }).ayuda).toContain('1,6 km');
  });

  it('verificado sigue diciendo que no se mueve solo, y suma las entregas que lo acompañan si las hay', () => {
    expect(describirRespaldo({ nivel: 'verificado', entregas: 0, dias: 0 })).toEqual({ etiqueta: 'PIN VERIFICADO ✓', ayuda: 'Este pin está verificado: no se mueve solo.' });
    expect(describirRespaldo({ nivel: 'verificado', entregas: 3, dias: 2 }).ayuda).toBe('Este pin está verificado: no se mueve solo. 3 entregas coinciden con él.');
  });
});
