import { beforeEach, describe, expect, it } from 'vitest';
import { borrarMapa, guardarMapa, leerMapa } from './mapa-cache';
import type { VistaRuta } from '../../../../application/modelos';
const vista: VistaRuta = { camionId: 'cam-1', fecha: '2026-10-18', planificada: true, salidaMin: 480, horaLimiteRegresoMin: 1260, paradas: [], nuevas: [], hechas: [], sinPin: [], noAtendidas: [], enRiesgo: [] };
beforeEach(() => { localStorage.clear(); });
describe('ruta guardada en el dispositivo', () => {
  it('queda aislada por usuario y se elimina al salir', () => {
    expect(guardarMapa({ usuarioId: 'u1', vista, trazado: { perfil: 'driving-car', tramos: [] }, guardadoEn: '2026-10-18T10:00:00Z' })).toBe(true);
    expect(leerMapa('u1')?.vista.camionId).toBe('cam-1');
    expect(leerMapa('u2')).toBeUndefined();
    borrarMapa();
    expect(leerMapa()).toBeUndefined();
  });
  it('tolera almacenamiento corrupto', () => {
    localStorage.setItem('reparto:mapa-guardado:v1', '{');
    expect(leerMapa()).toBeUndefined();
    localStorage.setItem('reparto:mapa-guardado:v1', '{}');
    expect(leerMapa()).toBeUndefined();
  });
});
