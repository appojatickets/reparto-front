/** Pantalla de estado del sistema (ADR 0051 del back): para saber si todo está al día y cuándo hay datos para mirar la analítica. */

/** «hace 5 min», «hace 3 h», «hace 2 días». */
export const haceCuanto = (desde: Date, ahora: Date): string => {
  const min = Math.max(0, Math.round((ahora.getTime() - desde.getTime()) / 60_000));
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  if (min < 48 * 60) return `hace ${Math.round(min / 60)} h`;
  return `hace ${Math.round(min / 1440)} días`;
};

/** Con cuántos días de reparto ya se puede empezar a sacar conclusiones de la analítica (menos que esto son pocos datos). */
export const JORNADAS_PARA_CONCLUIR = 10;
export const AVISOS_PARA_CONCLUIR = 150;

export type Cobertura = { readonly jornadasTerminadas: number; readonly avisos: number };

export const hayDatosSuficientes = (c: Cobertura): boolean => c.jornadasTerminadas >= JORNADAS_PARA_CONCLUIR && c.avisos >= AVISOS_PARA_CONCLUIR;

/** Las versiones son el commit publicado: si no coinciden en dos partes, puede que una se haya desplegado y la otra no (solo informativo). */
export const versionVisible = (v: string | undefined): string => (v === undefined || v === '' ? 'no informa' : v);
