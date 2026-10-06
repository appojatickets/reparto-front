import { describe, expect, it, vi } from 'vitest';
import { err, ok } from '../../domain/result';
import type { ApiClient } from '../ports/api-client';
import type { Ubicacion } from '../ports/ubicacion';
import { fakeApi } from './fakes.test-util';
import { crearSeguimiento, LOTE_MAXIMO, MAX_PENDIENTES } from './seguimiento';

const AHORA = new Date('2026-10-05T15:00:00Z');
const gps = (extra: { velocidadMs?: number } = {}): Ubicacion => ({ disponible: true, actual: () => Promise.resolve(ok({ lat: -33.5, lng: -70.7, precisionM: 12, ...extra })) });
const respuesta = { guardados: 1, descartados: 0, llegadasAutomaticas: [] as string[] };

describe('seguimiento del camión', () => {
  it('lee el GPS y lo manda con la hora', async () => {
    const enviarPosiciones = vi.fn(() => Promise.resolve(ok(respuesta)));
    const s = crearSeguimiento({ api: fakeApi({ enviarPosiciones }), ubicacion: gps({ velocidadMs: 0.5 }), ahora: () => AHORA });
    expect(await s.muestrear()).toBe('enviado');
    expect(enviarPosiciones).toHaveBeenCalledWith([{ lat: -33.5, lng: -70.7, precisionM: 12, velocidadMs: 0.5, tomadoEn: '2026-10-05T15:00:00.000Z' }]);
    expect(s.pendientes()).toBe(0);
  });

  it('sin GPS o sin permiso no manda nada', async () => {
    const enviarPosiciones = vi.fn(() => Promise.resolve(ok(respuesta)));
    const sinGps = crearSeguimiento({ api: fakeApi({ enviarPosiciones }), ubicacion: { disponible: false, actual: () => Promise.resolve(err('NO_DISPONIBLE' as const)) }, ahora: () => AHORA });
    expect(await sinGps.muestrear()).toBe('sin_gps');
    const sinPermiso = crearSeguimiento({ api: fakeApi({ enviarPosiciones }), ubicacion: { disponible: true, actual: () => Promise.resolve(err('PERMISO' as const)) }, ahora: () => AHORA });
    expect(await sinPermiso.muestrear()).toBe('sin_gps');
    expect(enviarPosiciones).not.toHaveBeenCalled();
  });

  it('sin señal guarda los puntos y los manda juntos cuando vuelve, en lotes', async () => {
    const enviarPosiciones = vi.fn()
      .mockResolvedValueOnce(err({ kind: 'NETWORK' as const }))
      .mockResolvedValueOnce(err({ kind: 'NETWORK' as const }))
      .mockResolvedValue(ok(respuesta));
    const s = crearSeguimiento({ api: fakeApi({ enviarPosiciones }), ubicacion: gps(), ahora: () => AHORA });
    expect(await s.muestrear()).toBe('guardado');
    expect(await s.muestrear()).toBe('guardado');
    expect(s.pendientes()).toBe(2);
    expect(await s.muestrear()).toBe('enviado');
    expect(enviarPosiciones).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ lat: -33.5 })]));
    expect(enviarPosiciones.mock.calls[2]?.[0]).toHaveLength(3);
    expect(s.pendientes()).toBe(0);
  });

  it('no manda más de un lote por vez ni guarda más de lo razonable', async () => {
    const enviarPosiciones = vi.fn<ApiClient['enviarPosiciones']>(() => Promise.resolve(err({ kind: 'NETWORK' as const })));
    const s = crearSeguimiento({ api: fakeApi({ enviarPosiciones }), ubicacion: gps(), ahora: () => AHORA });
    for (let i = 0; i < MAX_PENDIENTES + 10; i += 1) await s.muestrear();
    expect(s.pendientes()).toBe(MAX_PENDIENTES);
    expect(enviarPosiciones.mock.calls.at(-1)?.[0]).toHaveLength(LOTE_MAXIMO);
  });

  it('si el servidor dice que no hay jornada (o rechaza el punto) no insiste', async () => {
    const enviarPosiciones = vi.fn(() => Promise.resolve(err({ kind: 'HTTP' as const, status: 422, mensaje: 'Primero elige el camión' })));
    const s = crearSeguimiento({ api: fakeApi({ enviarPosiciones }), ubicacion: gps(), ahora: () => AHORA });
    expect(await s.muestrear()).toBe('sin_jornada');
    expect(s.pendientes()).toBe(0);
  });
});
