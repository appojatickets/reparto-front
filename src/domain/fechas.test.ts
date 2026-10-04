import { describe, expect, it } from 'vitest';
import { fechaEnChile, fechaLarga, sumarDias } from './fechas';

describe('fechas de reparto', () => {
  it('usa el día de Chile, no el UTC', () => {
    expect(fechaEnChile(new Date('2026-10-06T01:30:00Z'))).toBe('2026-10-05'); // 22:30 en Chile (UTC-3)
    expect(fechaEnChile(new Date('2026-07-01T03:30:00Z'))).toBe('2026-06-30'); // invierno UTC-4
  });
  it('suma días cruzando mes y año', () => {
    expect(sumarDias('2026-10-31', 1)).toBe('2026-11-01');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('escribe la fecha en español', () => {
    expect(fechaLarga('2026-10-05')).toBe('lunes, 5 de octubre');
  });
});
