import { describe, expect, it } from 'vitest';
import { haceCuanto, hayDatosSuficientes, versionVisible } from './estado';

const ahora = new Date('2026-10-15T12:00:00Z');

describe('estado del sistema', () => {
  it('dice hace cuánto pasó algo en palabras simples', () => {
    expect(haceCuanto(new Date('2026-10-15T11:59:40Z'), ahora)).toBe('hace un momento');
    expect(haceCuanto(new Date('2026-10-15T11:25:00Z'), ahora)).toBe('hace 35 min');
    expect(haceCuanto(new Date('2026-10-15T07:00:00Z'), ahora)).toBe('hace 5 h');
    expect(haceCuanto(new Date('2026-10-10T12:00:00Z'), ahora)).toBe('hace 5 días');
  });

  it('hay datos suficientes con 10 jornadas terminadas y 150 avisos', () => {
    expect(hayDatosSuficientes({ jornadasTerminadas: 10, avisos: 150 })).toBe(true);
    expect(hayDatosSuficientes({ jornadasTerminadas: 9, avisos: 500 })).toBe(false);
    expect(hayDatosSuficientes({ jornadasTerminadas: 30, avisos: 100 })).toBe(false);
  });

  it('una versión que no se informa se dice', () => {
    expect(versionVisible('e34edc2')).toBe('e34edc2');
    expect(versionVisible(undefined)).toBe('no informa');
  });
});
