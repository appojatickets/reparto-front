import type { Tramo } from './horario-semanal';

/**
 * Lee el horario que alguien escribió en la nota de un local («De 7 AM a 10 pm horario continuo», «Cierra de 2 a 4 pm», «Desde las 9 am»…)
 * y lo devuelve como tramos de atención del día (minutos). Es conservador: si algo no queda claro devuelve `undefined` y no adivina,
 * porque un horario mal leído se vuelve una restricción dura de la ruta.
 */

const FIN_DEL_DIA = 1439;
const MINIMO_TRAMO = 15;
const MAX_TRAMOS = 3;

type Hora = { readonly h: number; readonly min: number; readonly suf?: 'am' | 'pm' };

const TOKEN = /(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\b\.?|p\.?\s?m\b\.?)?/gi;

const sinTildes = (t: string): string => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const horasDe = (segmento: string): Hora[] | undefined => {
  const horas: Hora[] = [];
  for (const m of segmento.matchAll(TOKEN)) {
    const h = Number(m[1]);
    const min = m[2] !== undefined ? Number(m[2]) : 0;
    if (h > 23 || min > 59) return undefined;
    const suf = m[3] === undefined ? undefined : m[3].toLowerCase().startsWith('a') ? ('am' as const) : ('pm' as const);
    horas.push({ h, min, ...(suf ? { suf } : {}) });
  }
  return horas;
};

const aMinutos = (t: Hora, suf: 'am' | 'pm' | undefined): number => {
  if (suf === 'am') return (t.h === 12 ? 0 : t.h) * 60 + t.min;
  if (suf === 'pm') return (t.h < 12 ? t.h + 12 : t.h) * 60 + t.min;
  return t.h * 60 + t.min;
};

/** Un rango «de A a B». Si falta am/pm en uno, toma el del otro; si no hay ninguno solo se acepta cuando es evidente (horas diurnas). */
const rango = (a: Hora, b: Hora): Tramo | undefined => {
  if (a.suf === undefined && b.suf === undefined) {
    const evidente = a.h >= 7 && b.h >= 8 && b.h > a.h;
    if (!evidente) return undefined;
    return { desde: aMinutos(a, undefined), hasta: aMinutos(b, undefined) };
  }
  const sufA = a.suf ?? b.suf;
  const sufB = b.suf ?? a.suf;
  let desde = aMinutos(a, sufA);
  const hasta = aMinutos(b, sufB);
  // «9 a 12 pm»: el 9 es de la mañana, no de la noche.
  if (desde >= hasta && a.suf === undefined && sufA === 'pm') desde = aMinutos(a, 'am');
  return hasta - desde >= MINIMO_TRAMO ? { desde, hasta } : undefined;
};

const restar = (base: readonly Tramo[], cierre: Tramo): Tramo[] =>
  base.flatMap((t) => {
    if (cierre.hasta <= t.desde || cierre.desde >= t.hasta) return [t];
    return [
      ...(cierre.desde > t.desde ? [{ desde: t.desde, hasta: cierre.desde }] : []),
      ...(cierre.hasta < t.hasta ? [{ desde: cierre.hasta, hasta: t.hasta }] : []),
    ];
  });

export const horarioDeNota = (nota: string): readonly Tramo[] | undefined => {
  const segmentos = nota
    .replace(/\b(y|e)\s+de\s*\|\s*/gi, '$1 de ')
    .split('|')
    .map((s) => sinTildes(s.trim()))
    .filter((s) => s !== '');

  const abiertos: Tramo[] = [];
  const cierres: Tramo[] = [];
  let abreDesde: number | undefined;
  let cierraA: number | undefined;
  let leyoAlgo = false;

  for (const s of segmentos) {
    if (!/\d/.test(s) || /\d{5,}/.test(s) || /feriado|maps lo marca/.test(s) || /^despues de/.test(s)) continue;
    const horas = horasDe(s);
    if (!horas || horas.length === 0) return undefined;
    const [a, b] = horas;
    if (!a) return undefined;
    const esCierre = /\bcierra\b|\bcierre\b/.test(s);

    if (esCierre && horas.length === 2 && b) {
      const r = rango(a, b);
      if (!r) return undefined;
      cierres.push(r);
    } else if (esCierre && horas.length === 1) {
      const m = aMinutos(a, a.suf);
      if (a.suf === undefined && a.h < 7) return undefined;
      cierraA = m;
    } else if (/\bapertura\b|\babre\b/.test(s) && horas.length === 1) {
      if (a.suf === undefined && a.h < 7) return undefined;
      abreDesde = aMinutos(a, a.suf);
    } else if (horas.length >= 2 && horas.length % 2 === 0) {
      for (let i = 0; i < horas.length; i += 2) {
        const x = horas[i];
        const y = horas[i + 1];
        const r = x && y ? rango(x, y) : undefined;
        if (!r) return undefined;
        abiertos.push(r);
      }
    } else if (horas.length === 1) {
      if (a.suf === undefined && a.h < 7) return undefined;
      const m = aMinutos(a, a.suf);
      if (/desde|en adelante|a partir/.test(s)) abreDesde = m;
      else if (/hasta|recibe/.test(s)) cierraA = m;
      else return undefined;
    } else {
      return undefined;
    }
    leyoAlgo = true;
  }
  if (!leyoAlgo) return undefined;

  let base: Tramo[];
  if (abiertos.length > 0) base = [...abiertos].sort((x, y) => x.desde - y.desde);
  else if (abreDesde !== undefined) base = [{ desde: abreDesde, hasta: cierraA ?? FIN_DEL_DIA }];
  else if (cierraA !== undefined) base = [{ desde: 0, hasta: cierraA }];
  else if (cierres.length > 0) base = [{ desde: 0, hasta: FIN_DEL_DIA }];
  else return undefined;

  const tramos = cierres.reduce(restar, base).filter((t) => t.hasta - t.desde >= MINIMO_TRAMO);
  for (let i = 1; i < tramos.length; i++) {
    const previo = tramos[i - 1];
    const actual = tramos[i];
    if (previo && actual && actual.desde < previo.hasta) return undefined;
  }
  return tramos.length > 0 && tramos.length <= MAX_TRAMOS ? tramos : undefined;
};

/** La nota trae números que parecen un horario (para avisar de las que no se entendieron). */
export const pareceHorario = (nota: string): boolean => /\d/.test(nota) && /\b(am|pm|a\.m|p\.m|hrs|horas?|horario|abre|cierra|apertura|cierre|desde|hasta)\b/i.test(sinTildes(nota));
