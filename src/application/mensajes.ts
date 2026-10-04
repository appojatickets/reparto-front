import type { ApiError } from './ports/api-client';

/** Texto en lenguaje simple para mostrar en pantalla. Los errores de negocio de la API ya vienen en español. */
export const mensajeDeError = (e: ApiError, porDefecto = 'No se pudo completar. Intenta de nuevo.'): string => {
  switch (e.kind) {
    case 'NETWORK':
      return 'Sin conexión. Revisa tu señal e intenta de nuevo.';
    case 'TIMEOUT':
      return 'El servidor tarda en responder. Espera un momento e intenta de nuevo.';
    case 'HTTP':
      if (e.status === 403 && e.codigo === 'SIN_PERMISO') return 'No tienes permiso para hacer esto.';
      if (e.status === 502) return 'No se pudo conectar con un servicio externo. Intenta de nuevo.';
      return e.mensaje ?? porDefecto;
    case 'UNEXPECTED':
      return porDefecto;
  }
};

/** Los errores de validación de la API traen `detalle.errores[].mensaje`; se muestran uno por línea. */
export const mensajesDeDetalle = (e: ApiError): readonly string[] => {
  const d = e.detalle;
  const errores = typeof d === 'object' && d !== null ? (d as { errores?: unknown }).errores : undefined;
  if (!Array.isArray(errores)) return [];
  return errores.flatMap((x: unknown) => {
    const m = typeof x === 'object' && x !== null ? (x as { mensaje?: unknown }).mensaje : undefined;
    return typeof m === 'string' ? [m] : [];
  });
};
