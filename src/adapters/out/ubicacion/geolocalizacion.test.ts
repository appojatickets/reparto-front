import { describe, expect, it, vi } from 'vitest';
import { crearUbicacionWeb } from './geolocalizacion';

const PERMISSION_DENIED = 1;
const TIMEOUT = 3;
const POSITION_UNAVAILABLE = 2;

const geo = (resultado: { ok: { latitude: number; longitude: number; accuracy: number } } | { error: number }) => ({
  getCurrentPosition: vi.fn((exito: PositionCallback, fallo?: PositionErrorCallback | null) => {
    if ('ok' in resultado) exito({ coords: resultado.ok } as GeolocationPosition);
    else fallo?.({ code: resultado.error, PERMISSION_DENIED, TIMEOUT, POSITION_UNAVAILABLE } as GeolocationPositionError);
  }),
});

describe('ubicación del teléfono', () => {
  it('sin API de geolocalización no está disponible', async () => {
    const u = crearUbicacionWeb(undefined);
    expect(u.disponible).toBe(false);
    expect(await u.actual()).toEqual({ ok: false, error: 'NO_DISPONIBLE' });
  });

  it('una lectura correcta trae latitud, longitud y precisión; pide alta precisión con tiempo límite', async () => {
    const g = geo({ ok: { latitude: -33.45, longitude: -70.66, accuracy: 14 } });
    const u = crearUbicacionWeb(g, 9000);
    expect(await u.actual()).toEqual({ ok: true, value: { lat: -33.45, lng: -70.66, precisionM: 14 } });
    expect(g.getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { enableHighAccuracy: true, timeout: 9000, maximumAge: 5000 });
  });

  it('traduce los errores: permiso, tiempo y no disponible', async () => {
    expect(await crearUbicacionWeb(geo({ error: PERMISSION_DENIED })).actual()).toEqual({ ok: false, error: 'PERMISO' });
    expect(await crearUbicacionWeb(geo({ error: TIMEOUT })).actual()).toEqual({ ok: false, error: 'TIEMPO' });
    expect(await crearUbicacionWeb(geo({ error: POSITION_UNAVAILABLE })).actual()).toEqual({ ok: false, error: 'NO_DISPONIBLE' });
  });
});
