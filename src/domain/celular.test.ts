import { describe, expect, it } from 'vitest';
import { formatearCelular } from './celular';

describe('formatearCelular', () => {
  it('separa el celular chileno para leerlo', () => {
    expect(formatearCelular('56912345678')).toBe('+56 9 1234 5678');
  });
  it('lo que no tiene ese formato queda igual', () => {
    expect(formatearCelular('123')).toBe('123');
  });
});
