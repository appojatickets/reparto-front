import type { ApiClient } from '../ports/api-client';
import type { PuntoGps } from '../modelos';
import type { Posicion, Ubicacion } from '../ports/ubicacion';

/** El servidor recibe hasta 30 puntos por envío. */
export const LOTE_MAXIMO = 30;
/** Si no hay señal, se guardan los puntos para mandarlos después; no se acumulan más que esto (cerca de 2 horas y media con un punto cada 15 s). */
export const MAX_PENDIENTES = 600;

export type ResultadoMuestra = 'enviado' | 'guardado' | 'sin_gps' | 'sin_jornada';

/**
 * Sigue al camión mientras la app está abierta: lee el GPS, lo manda al servidor (que anota solo la llegada si el camión se
 * queda junto al pin de una entrega) y, si no hay señal, lo guarda para el próximo envío. Si el servidor dice que no hay jornada
 * (el usuario aún no elige camión) o rechaza el punto, no insiste.
 */
/** Con el GPS continuo se guarda como mucho un punto cada tanto (el teléfono puede dar varios por segundo). */
export const SEPARACION_MINIMA_MS = 15_000;
/** Cuántos lotes se mandan seguidos al recuperar la señal. */
const LOTES_POR_ENVIO = 5;

export const crearSeguimiento = ({ api, ubicacion, ahora }: { readonly api: ApiClient; readonly ubicacion: Ubicacion; readonly ahora: () => Date }) => {
  let pendientes: PuntoGps[] = [];
  let ultimo = -Infinity;
  const agregar = (p: Posicion, forzar = false): boolean => {
    const t = ahora().getTime();
    if (!forzar && t - ultimo < SEPARACION_MINIMA_MS) return false;
    ultimo = t;
    pendientes = [...pendientes, { lat: p.lat, lng: p.lng, precisionM: p.precisionM, ...(p.velocidadMs !== undefined ? { velocidadMs: p.velocidadMs } : {}), tomadoEn: new Date(t).toISOString() }].slice(-MAX_PENDIENTES);
    return true;
  };
  const enviar = async (): Promise<ResultadoMuestra> => {
    if (pendientes.length === 0) return 'enviado';
    for (let i = 0; i < LOTES_POR_ENVIO && pendientes.length > 0; i += 1) {
      const lote = pendientes.slice(0, LOTE_MAXIMO);
      const r = await api.enviarPosiciones(lote);
      if (!r.ok) {
        const estado = r.error.kind === 'HTTP' ? r.error.status : undefined;
        if (estado !== undefined && estado >= 400 && estado < 500) {
          pendientes = pendientes.slice(lote.length);
          return 'sin_jornada';
        }
        return 'guardado';
      }
      pendientes = pendientes.slice(lote.length);
    }
    return 'enviado';
  };
  return {
    pendientes: (): number => pendientes.length,
    /** Un punto del GPS continuo: se guarda si pasó el tiempo mínimo desde el anterior (se manda con `enviar`). */
    agregar: (p: Posicion): boolean => agregar(p),
    enviar,
    /** Sin GPS continuo: lee una vez, lo guarda y manda lo pendiente. */
    async muestrear(): Promise<ResultadoMuestra> {
      if (!ubicacion.disponible) return 'sin_gps';
      const p = await ubicacion.actual();
      if (!p.ok) return 'sin_gps';
      agregar(p.value, true);
      return enviar();
    },
  };
};

export type Seguimiento = ReturnType<typeof crearSeguimiento>;
