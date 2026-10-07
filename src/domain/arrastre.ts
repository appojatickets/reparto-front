/**
 * Arrastrar una parada para cambiarla de lugar: la cuenta de a qué lugar corresponde el dedo, cuánto se desplaza la pantalla cuando se
 * acerca al borde y cómo queda la lista al soltar. Todo es aritmética pura; el gesto (eventos del dedo) vive en la interfaz.
 */

/**
 * Lugar final de la fila arrastrada: cuántas de las OTRAS filas quedan por encima de su centro. `medios` son los centros de todas las
 * filas en su orden actual y `centro` el de la fila arrastrada, en la misma escala (por ejemplo, píxeles de página).
 */
export const destinoDeArrastre = (medios: readonly number[], origen: number, centro: number): number =>
  medios.reduce((arriba, m, i) => (i !== origen && m < centro ? arriba + 1 : arriba), 0);

/**
 * Píxeles que se desplaza la pantalla por cuadro mientras se arrastra: negativo (sube) cerca del borde de arriba, positivo (baja) cerca del
 * de abajo, más rápido mientras más cerca del borde, hasta `maxima`. En el medio no se mueve.
 */
export const velocidadDeDesplazamiento = (y: number, alto: number, borde = 96, maxima = 18): number => {
  const hacia = y < borde ? -(borde - y) : y > alto - borde ? y - (alto - borde) : 0;
  const v = Math.round(maxima * Math.min(1, Math.abs(hacia) / borde)) * Math.sign(hacia);
  return v === 0 ? 0 : v;
};

/** La lista tal como queda al soltar `id` en `destino` (se acota a los extremos), con las posiciones renumeradas. Si `id` no está, la misma lista. */
export const reordenarParadas = <T extends { readonly facturaId: string; readonly posicion: number }>(paradas: readonly T[], id: string, destino: number): readonly T[] => {
  const parada = paradas.find((p) => p.facturaId === id);
  if (!parada) return paradas;
  const otras = paradas.filter((p) => p.facturaId !== id);
  const lugar = Math.max(0, Math.min(Math.trunc(destino), otras.length));
  return [...otras.slice(0, lugar), parada, ...otras.slice(lugar)].map((p, posicion) => ({ ...p, posicion }));
};
