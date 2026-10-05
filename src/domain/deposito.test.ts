import { describe, expect, it } from 'vitest';
import { llegoAlDeposito } from './deposito';

const DEPOSITO = { lat: -33.607, lng: -70.5296 };

describe('llegada al depósito', () => {
  it('a menos de 150 m cuenta como llegada; más lejos, no', () => {
    expect(llegoAlDeposito({ ...DEPOSITO, precisionM: 10 }, DEPOSITO)).toBe(true);
    expect(llegoAlDeposito({ lat: -33.6075, lng: -70.5296, precisionM: 10 }, DEPOSITO)).toBe(true); // ~55 m
    expect(llegoAlDeposito({ lat: -33.6095, lng: -70.5296, precisionM: 10 }, DEPOSITO)).toBe(false); // ~280 m
    expect(llegoAlDeposito({ lat: -33.58, lng: -70.52, precisionM: 10 }, DEPOSITO)).toBe(false);
  });

  it('una lectura muy imprecisa no sirve para afirmar que llegó', () => {
    expect(llegoAlDeposito({ ...DEPOSITO, precisionM: 400 }, DEPOSITO)).toBe(false);
  });
});
