import { describe, expect, it } from 'vitest';
import { textoMotivos } from './motivos';

describe('textoMotivos', () => {
  it('une los motivos en lenguaje simple', () => {
    expect(textoMotivos(['VENTANA_DURA', 'CERCANIA_COMUNA'])).toBe('Cierra pronto · Queda cerca de la anterior');
    expect(textoMotivos(['CIERRE_PROBABLE', 'MENOR_DESVIO'])).toBe('Suele estar cerrado a esta hora · Es el mejor recorrido');
    expect(textoMotivos([])).toBe('');
  });
});
