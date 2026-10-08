/** Qué tan firme es un pin según las entregas (lo calcula el servidor; ver ADR 0030 del back). */
export type NivelRespaldoPin = 'verificado' | 'respaldado' | 'en_conflicto' | 'sin_respaldo';
export type PinRespaldo = {
  readonly nivel: NivelRespaldoPin;
  /** Cuántas entregas coinciden entre sí, en cuántos días distintos, y a cuántos metros del pin. */
  readonly entregas: number;
  readonly dias: number;
  readonly distanciaM?: number;
};

const plural = (n: number, uno: string, varios: string): string => `${n} ${n === 1 ? uno : varios}`;
const distancia = (m: number): string => (m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m)} m`);

/** Quién dejó verificado el pin, en palabras simples (para la ficha y la lista de revisión). */
export const textoDeQuienVerifico = (quien: 'persona' | 'entregas' | undefined): string =>
  quien === 'entregas' ? 'Lo verificaron las entregas: coinciden con el pin.' : quien === 'persona' ? 'Lo verificó una persona.' : 'Está verificado.';

/** La etiqueta corta y la explicación, en lenguaje simple, de cómo está respaldado un pin. */
export const describirRespaldo = (r: PinRespaldo): { readonly etiqueta: string; readonly ayuda: string } => {
  switch (r.nivel) {
    case 'verificado':
      return { etiqueta: 'PIN VERIFICADO ✓', ayuda: `Este pin está verificado: no se mueve solo.${r.entregas > 0 ? ` ${plural(r.entregas, 'entrega coincide', 'entregas coinciden')} con él.` : ''}` };
    case 'respaldado':
      return { etiqueta: 'PIN RESPALDADO POR ENTREGAS', ayuda: `${plural(r.entregas, 'entrega', 'entregas')}, en ${plural(r.dias, 'día', 'días')}, coinciden junto a este pin. Puedes verificarlo con confianza.` };
    case 'en_conflicto':
      return {
        etiqueta: 'PIN EN CONFLICTO',
        ayuda: r.entregas >= 2 && r.distanciaM !== undefined && r.distanciaM > 150 ? `Las entregas coinciden a ${distancia(r.distanciaM)} de este pin. Revisa dónde está el local.` : 'Las entregas se avisaron desde lugares distintos. Revisa dónde está el local.',
      };
    case 'sin_respaldo':
      return {
        etiqueta: 'PIN SIN RESPALDO',
        ayuda: r.entregas === 0 ? 'Todavía no hay entregas que lo confirmen. Se va ajustando con el lugar donde se entrega.' : `Hay ${plural(r.entregas, 'entrega', 'entregas')} con GPS; con otra, en otro día, queda respaldado.`,
      };
  }
};
