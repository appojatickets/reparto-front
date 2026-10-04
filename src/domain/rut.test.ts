import { describe, expect, it } from 'vitest';
import { completarRut, formatearRut } from './rut';

describe('completarRut', () => {
  it('con el dígito verificador y signos, o sin ellos', () => {
    expect(completarRut('77.975.918-0')).toBe('77975918-0');
    expect(completarRut('779759180')).toBe('77975918-0');
    expect(completarRut('12.345.678-5')).toBe('12345678-5');
  });

  it('solo con números (sin dígito verificador): lo calcula', () => {
    expect(completarRut('77975918')).toBe('77975918-0');
    expect(completarRut('12345678')).toBe('12345678-5');
    expect(completarRut('1234567')).toBe('1234567-4');
  });

  it('un dígito verificador equivocado o un formato raro no se acepta', () => {
    for (const t of ['77975918-1', '123', 'abc', '', '12345678901']) expect(completarRut(t), t).toBeUndefined();
  });

  it('formatea con puntos para mostrarlo', () => {
    expect(formatearRut('77975918-0')).toBe('77.975.918-0');
    expect(formatearRut('1234567-4')).toBe('1.234.567-4');
  });
});
