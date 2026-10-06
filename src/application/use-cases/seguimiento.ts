import type { ApiClient } from '../ports/api-client';
import type { PuntoGps } from '../modelos';
import type { Ubicacion } from '../ports/ubicacion';

/** El servidor recibe hasta 30 puntos por envío. */
export const LOTE_MAXIMO = 30;
/** Si no hay señal, se guardan los puntos para mandarlos después; no se acumulan más que esto (cerca de 2 horas). */
export const MAX_PENDIENTES = 120;

export type ResultadoMuestra = 'enviado' | 'guardado' | 'sin_gps' | 'sin_jornada';

/**
 * Sigue al camión mientras la app está abierta: lee el GPS, lo manda al servidor (que anota solo la llegada si el camión se
 * queda junto al pin de una entrega) y, si no hay señal, lo guarda para el próximo envío. Si el servidor dice que no hay jornada
 * (el usuario aún no elige camión) o rechaza el punto, no insiste.
 */
export const crearSeguimiento = ({ api, ubicacion, ahora }: { readonly api: ApiClient; readonly ubicacion: Ubicacion; readonly ahora: () => Date }) => {
  let pendientes: PuntoGps[] = [];
  return {
    pendientes: (): number => pendientes.length,
    async muestrear(): Promise<ResultadoMuestra> {
      if (!ubicacion.disponible) return 'sin_gps';
      const p = await ubicacion.actual();
      if (!p.ok) return 'sin_gps';
      pendientes = [...pendientes, { lat: p.value.lat, lng: p.value.lng, precisionM: p.value.precisionM, ...(p.value.velocidadMs !== undefined ? { velocidadMs: p.value.velocidadMs } : {}), tomadoEn: ahora().toISOString() }].slice(-MAX_PENDIENTES);
      const lote = pendientes.slice(0, LOTE_MAXIMO);
      const r = await api.enviarPosiciones(lote);
      if (r.ok) {
        pendientes = pendientes.slice(lote.length);
        return 'enviado';
      }
      const estado = r.error.kind === 'HTTP' ? r.error.status : undefined;
      if (estado !== undefined && estado >= 400 && estado < 500) {
        pendientes = pendientes.slice(lote.length);
        return 'sin_jornada';
      }
      return 'guardado';
    },
  };
};

export type Seguimiento = ReturnType<typeof crearSeguimiento>;
