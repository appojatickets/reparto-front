import { describe, expect, it } from 'vitest';
import { describirOrigenPin } from './origen-pin';

describe('origen y confirmación del pin', () => {
  it('distingue Gemini pendiente, entregas confirmadas y estimación', () => {
    expect(describirOrigenPin({ pinFuente: 'gemini' })).toBe('Fijado por Gemini · pendiente de verificar');
    expect(describirOrigenPin({ pinFuente: 'gemini', pinVerificado: true, pinVerificacion: 'entregas' })).toBe('Confirmado por entregas');
    expect(describirOrigenPin({ ubicacionAproximada: true })).toBe('Ubicación estimada');
    expect(describirOrigenPin({})).toBeUndefined();
  });
});
