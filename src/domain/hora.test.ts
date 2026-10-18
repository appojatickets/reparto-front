import { describe, expect, it } from 'vitest';
import { horaAproximada, horaDeMinutos, horaDelDia, minutosDeHora } from './hora';

describe('hora aproximada', () => {
  it('se redondea a los 5 minutos y nunca lleva decimales', () => {
    expect(horaAproximada(607.7747575)).toBe('10:10');
    expect(horaAproximada(610)).toBe('10:10');
    expect(horaAproximada(702.4)).toBe('11:40');
    expect(horaAproximada(1498)).toBe('01:00');
  });
});

describe('hora del día', () => {
  it('convierte HH:MM a minutos y de vuelta', () => {
    expect(minutosDeHora('13:30')).toBe(810);
    expect(minutosDeHora('0:05')).toBe(5);
    expect(minutosDeHora('23:59')).toBe(1439);
    expect(horaDeMinutos(810)).toBe('13:30');
    expect(horaDeMinutos(5)).toBe('00:05');
  });
  it('rechaza horas inválidas o vacías', () => {
    for (const t of ['', '24:00', '12:60', 'abc', '1230']) expect(minutosDeHora(t)).toBeUndefined();
  });
  it('una hora pasada la medianoche vuelve a empezar', () => {
    expect(horaDelDia(1500)).toBe('01:00');
    expect(horaDelDia(485.6)).toBe('08:06');
  });
});
