import { describe, expect, it } from 'vitest';
import { mismoTexto, normalizar } from './texto';

describe('texto', () => {
  it('normaliza: sin tildes ni puntuación, minúsculas y espacios simples', () => {
    expect(normalizar('  Avenida   Colón, N° 765 ')).toBe('avenida colon n 765');
  });

  it('el nombre que es solo la dirección cuenta como lo mismo aunque cambien mayúsculas, tildes o espacios', () => {
    expect(mismoTexto('jupiter 1750', 'Júpiter  1750')).toBe(true);
    expect(mismoTexto('Rabelo Mágica SpA', 'Av. Colón 765')).toBe(false);
  });
});
