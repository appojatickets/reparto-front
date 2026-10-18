import { horaDelDia } from './hora';

/** Lo que se aprendió de un local con sus entregas (ADR 0049 del back): se muestra en lenguaje simple, con rangos y no horas fijas. */
export type RangoHabitual = { readonly desdeMin: number; readonly hastaMin: number; readonly medianaMin: number; readonly entregas: number };
export type FichaAprendida = {
  readonly visitas: number;
  readonly entregas: number;
  readonly cerrados: number;
  readonly confianza: number;
  readonly horaHabitual?: RangoHabitual;
  readonly porDiaSemana: readonly (RangoHabitual & { readonly diaSemana: number })[];
  readonly franjas: readonly { readonly desdeHora: number; readonly hastaHora: number; readonly visitas: number; readonly cerrados: number; readonly pCerrado: number }[];
};

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;
export const nombreDelDia = (d: number): string => DIAS[d] ?? '';

const hora = (h: number): string => horaDelDia(h * 60);

/** Con menos de 5 visitas la ficha es una pista, no una regla. */
export const ES_POCA_EVIDENCIA = (f: FichaAprendida): boolean => f.visitas < 5;

export const textoDeRango = (r: RangoHabitual): string =>
  r.desdeMin === r.hastaMin ? `a las ${horaDelDia(r.medianaMin)}` : `entre las ${horaDelDia(r.desdeMin)} y las ${horaDelDia(r.hastaMin)} (lo más común: ${horaDelDia(r.medianaMin)})`;

/** Las franjas en que más veces se encontró cerrado: de «posible» (la mitad o más) hacia arriba, solo con 2 o más visitas. */
export const franjasDeCierre = (f: FichaAprendida): readonly { readonly texto: string; readonly cerrados: number; readonly visitas: number }[] =>
  f.franjas
    .filter((x) => x.visitas >= 2 && x.cerrados > 0)
    .sort((a, b) => b.pCerrado - a.pCerrado)
    .map((x) => ({ texto: `de ${hora(x.desdeHora)} a ${hora(x.hastaHora)}`, cerrados: x.cerrados, visitas: x.visitas }));
