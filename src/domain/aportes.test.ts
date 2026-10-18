import { describe, expect, it } from 'vitest';
import { resumenDeQuienesAportaron, textoDeAportes } from './aportes';

describe('aportes a un local', () => {
  it('lo que aportó cada uno, en palabras', () => {
    expect(textoDeAportes(['foto', 'pin', 'entregas'], 3)).toBe('Subió la foto · Verificó el pin · 3 entregas');
    expect(textoDeAportes(['entregas'], 1)).toBe('1 entrega');
    expect(textoDeAportes(['pin'], 0)).toBe('Verificó el pin');
  });

  it('el resumen de quienes aportaron', () => {
    expect(resumenDeQuienesAportaron([])).toBe('');
    expect(resumenDeQuienesAportaron(['Juan'])).toBe('Juan');
    expect(resumenDeQuienesAportaron(['Juan', 'María'])).toBe('Juan y María');
    expect(resumenDeQuienesAportaron(['Juan', 'María', 'Pedro'])).toBe('Juan y 2 más');
  });
});
