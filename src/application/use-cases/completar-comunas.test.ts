import { describe, expect, it, vi } from 'vitest';
import { err, ok } from '../../domain/result';
import type { Geocodificador } from '../ports/geocodificador';
import type { Timer } from '../ports/timer';
import { crearCompletarComunas } from './completar-comunas';

const timer = () => {
  const esperas: number[] = [];
  const t: Timer = { after: (ms, fn) => { esperas.push(ms); fn(); return () => undefined; } };
  return { t, esperas };
};

describe('completar comunas desde los pines', () => {
  it('consulta de a uno con pausa, no repite un mismo punto y avisa el avance', async () => {
    const comunaDe = vi.fn<Geocodificador['comunaDe']>((lat) => Promise.resolve(lat < -33.8 ? ok('Paine') : ok('Buin')));
    const { t, esperas } = timer();
    const avance: number[] = [];
    const r = await crearCompletarComunas({ geocodificador: { comunaDe }, timer: t })(
      [{ numero: 3, lat: -33.81, lng: -70.7 }, { numero: 4, lat: -33.7, lng: -70.7 }, { numero: 9, lat: -33.81, lng: -70.7 }],
      (p) => avance.push(p.hechos),
    );
    expect(r).toEqual({ comunas: { 3: 'Paine', 4: 'Buin', 9: 'Paine' }, sinRespuesta: 0, detenido: false });
    expect(comunaDe).toHaveBeenCalledTimes(2);
    expect(esperas).toEqual([1100]);
    expect(avance).toEqual([1, 2, 3]);
  });

  it('un punto sin resultado se cuenta y sigue con los demás', async () => {
    const comunaDe = vi.fn<Geocodificador['comunaDe']>((lat) => Promise.resolve(lat === -33.1 ? err('SIN_RESULTADO') : ok('Colina')));
    const r = await crearCompletarComunas({ geocodificador: { comunaDe }, timer: timer().t })([{ numero: 1, lat: -33.1, lng: -70.7 }, { numero: 2, lat: -33.2, lng: -70.7 }]);
    expect(r).toEqual({ comunas: { 2: 'Colina' }, sinRespuesta: 1, detenido: false });
  });

  it('si el servicio corta (límite o sin red) se detiene y conserva lo encontrado', async () => {
    const comunaDe = vi.fn<Geocodificador['comunaDe']>()
      .mockResolvedValueOnce(ok('Paine'))
      .mockResolvedValueOnce(err('LIMITE'));
    const r = await crearCompletarComunas({ geocodificador: { comunaDe }, timer: timer().t })([
      { numero: 1, lat: -33.1, lng: -70.7 }, { numero: 2, lat: -33.2, lng: -70.7 }, { numero: 3, lat: -33.3, lng: -70.7 },
    ]);
    expect(r).toEqual({ comunas: { 1: 'Paine' }, sinRespuesta: 2, detenido: true });
    expect(comunaDe).toHaveBeenCalledTimes(2);
  });
});
