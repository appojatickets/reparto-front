import { err, ok } from '../../../domain/result';
import type { Ubicacion } from '../../../application/ports/ubicacion';

type Geo = Pick<Geolocation, 'getCurrentPosition'>;

const geoDelNavegador = (): Geo | undefined => {
  try {
    return globalThis.navigator.geolocation;
  } catch {
    return undefined;
  }
};

/** Una lectura de GPS con la mejor precisión disponible, con tiempo límite (el chofer no debe quedar esperando). */
export const crearUbicacionWeb = (geo: Geo | undefined = geoDelNavegador(), tiempoMs = 12_000): Ubicacion => ({
  disponible: geo !== undefined,
  actual: () =>
    new Promise((resolver) => {
      if (!geo) {
        resolver(err('NO_DISPONIBLE'));
        return;
      }
      geo.getCurrentPosition(
        (p) => { resolver(ok({ lat: p.coords.latitude, lng: p.coords.longitude, precisionM: p.coords.accuracy, ...(typeof p.coords.speed === 'number' && p.coords.speed >= 0 ? { velocidadMs: p.coords.speed } : {}) })); },
        (e) => { resolver(err(e.code === e.PERMISSION_DENIED ? 'PERMISO' : e.code === e.TIMEOUT ? 'TIEMPO' : 'NO_DISPONIBLE')); },
        { enableHighAccuracy: true, timeout: tiempoMs, maximumAge: 5_000 },
      );
    }),
});
