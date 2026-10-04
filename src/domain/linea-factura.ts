export type LineaFactura = { readonly folio?: string; readonly consulta: string };

import { leerNumeroHablado } from './numeros-es';

const PALABRAS_DE_FOLIO = new Set(['factura', 'folio', 'numero', 'nro', 'n', 'no']);
const sinTildes = (t: string): string => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const esFolio = (t: string): boolean => /^[A-Za-z]{0,3}-?\d[\d.]*$/.test(t);
const limpiarFolio = (t: string): string => t.replaceAll('.', '');

/**
 * Entiende lo que se dicta o escribe en una sola línea: «1234 minimarket rabet», «factura número 1234 minimarket rabet»
 * o «minimarket rabet 1234». El número del comienzo (o, si no hay, uno de 3 o más cifras al final) es el folio y el resto
 * es lo que se busca como cliente. Un número dentro del nombre («Bazar 24 horas») no se confunde con el folio.
 */
export const leerLineaFactura = (texto: string): LineaFactura => {
  const tokens = texto.trim().split(/\s+/).filter((t) => t !== '');
  // Quita «factura», «folio», «número»… del comienzo, pero solo si después viene el folio (así no se pierde parte de un nombre).
  let i = 0;
  while (i < tokens.length && PALABRAS_DE_FOLIO.has(sinTildes((tokens[i] ?? '').replace(/[.°º:]+$/u, '')))) i++;
  const hayFolioDespues = tokens[i] !== undefined && (esFolio(tokens[i] ?? '') || leerNumeroHablado(tokens.slice(i)) !== undefined);
  const resto = i > 0 && hayFolioDespues ? tokens.slice(i) : tokens;

  const primero = resto[0];
  if (primero !== undefined && esFolio(primero)) return { folio: limpiarFolio(primero), consulta: resto.slice(1).join(' ') };
  // Dictado con palabras: «mil doscientos treinta y cuatro minimarket rabet», «siete cero cero uno plaza oeste».
  const hablado = leerNumeroHablado(resto);
  if (hablado) return { folio: hablado.digitos, consulta: resto.slice(hablado.usados).join(' ') };
  const ultimo = resto[resto.length - 1];
  if (resto.length > 1 && ultimo !== undefined && /^\d[\d.]{2,}$/.test(ultimo)) return { folio: limpiarFolio(ultimo), consulta: resto.slice(0, -1).join(' ') };
  return { consulta: resto.join(' ') };
};
