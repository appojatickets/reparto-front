import { err, ok, type Result } from './result';
import { horaDeMinutos } from './hora';

/** 0 = domingo … 6 = sábado (igual que la API). */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Tramo = { readonly desde: number; readonly hasta: number };

/** Lo que se sabe de un día: nada, «cerrado», o los tramos en que atiende (más de uno si hay colación). */
export type DiaEstado =
  | { readonly estado: 'sin-dato' }
  | { readonly estado: 'cerrado' }
  | { readonly estado: 'abierto'; readonly tramos: readonly Tramo[] };

export type Semana = Readonly<Record<DiaSemana, DiaEstado>>;
export type DiaApi = { readonly dia: number; readonly cerrado: boolean; readonly tramos: readonly Tramo[] };

/** Orden en que se muestran los días (la semana empieza el lunes). */
export const DIAS: readonly { readonly dia: DiaSemana; readonly corto: string; readonly largo: string }[] = [
  { dia: 1, corto: 'LUN', largo: 'lunes' },
  { dia: 2, corto: 'MAR', largo: 'martes' },
  { dia: 3, corto: 'MIÉ', largo: 'miércoles' },
  { dia: 4, corto: 'JUE', largo: 'jueves' },
  { dia: 5, corto: 'VIE', largo: 'viernes' },
  { dia: 6, corto: 'SÁB', largo: 'sábado' },
  { dia: 0, corto: 'DOM', largo: 'domingo' },
];
export const LUN_A_VIE: readonly DiaSemana[] = [1, 2, 3, 4, 5];

const FIN_DEL_DIA = 1439;
const SIN_DATO: DiaEstado = { estado: 'sin-dato' };

export const semanaVacia = (): Semana => ({ 0: SIN_DATO, 1: SIN_DATO, 2: SIN_DATO, 3: SIN_DATO, 4: SIN_DATO, 5: SIN_DATO, 6: SIN_DATO });

/** Resultado de aplicar una opción a varios días. `omitidos` son los días donde no tenía sentido y no se tocaron. */
export type Aplicacion = { readonly semana: Semana; readonly omitidos: readonly DiaSemana[] };

const sobre = (semana: Semana, dias: readonly DiaSemana[], f: (d: DiaEstado) => DiaEstado | undefined): Aplicacion => {
  const nueva: Record<DiaSemana, DiaEstado> = { ...semana };
  const omitidos: DiaSemana[] = [];
  for (const dia of dias) {
    const r = f(semana[dia]);
    if (r) nueva[dia] = r;
    else omitidos.push(dia);
  }
  return { semana: nueva, omitidos };
};

export const marcarCerrado = (s: Semana, dias: readonly DiaSemana[]): Aplicacion => sobre(s, dias, () => ({ estado: 'cerrado' }));
export const marcarSinDato = (s: Semana, dias: readonly DiaSemana[]): Aplicacion => sobre(s, dias, () => SIN_DATO);

/** «Abre a las X»: cambia la hora de apertura y deja lo demás. Sin dato previo, abre a esa hora y no tiene hora de cierre. */
export const abreA = (s: Semana, dias: readonly DiaSemana[], minuto: number): Aplicacion =>
  sobre(s, dias, (d) => {
    if (d.estado !== 'abierto') return { estado: 'abierto', tramos: [{ desde: minuto, hasta: FIN_DEL_DIA }] };
    const primero = d.tramos[0];
    const ultimo = d.tramos[d.tramos.length - 1];
    if (!primero || !ultimo) return undefined;
    if (minuto >= primero.hasta) return { estado: 'abierto', tramos: [{ desde: minuto, hasta: Math.max(ultimo.hasta, minuto + 1) }] };
    return { estado: 'abierto', tramos: [{ desde: minuto, hasta: primero.hasta }, ...d.tramos.slice(1)] };
  });

/** «Cierra a las X»: cambia la hora de cierre. Sin dato previo, atiende desde el comienzo del día hasta esa hora. */
export const cierraA = (s: Semana, dias: readonly DiaSemana[], minuto: number): Aplicacion =>
  sobre(s, dias, (d) => {
    if (d.estado !== 'abierto') return { estado: 'abierto', tramos: [{ desde: 0, hasta: minuto }] };
    const primero = d.tramos[0];
    const ultimo = d.tramos[d.tramos.length - 1];
    if (!primero || !ultimo) return undefined;
    if (minuto <= ultimo.desde) return { estado: 'abierto', tramos: [{ desde: Math.min(primero.desde, Math.max(0, minuto - 1)), hasta: minuto }] };
    return { estado: 'abierto', tramos: [...d.tramos.slice(0, -1), { desde: ultimo.desde, hasta: minuto }] };
  });

const limites = (d: DiaEstado): { desde: number; hasta: number } | undefined => {
  if (d.estado !== 'abierto') return { desde: 0, hasta: FIN_DEL_DIA };
  const primero = d.tramos[0];
  const ultimo = d.tramos[d.tramos.length - 1];
  return primero && ultimo ? { desde: primero.desde, hasta: ultimo.hasta } : undefined;
};

/** Colación: el local cierra entre `desde` y `hasta`. `undefined` quita la colación. Debe quedar dentro del horario del día. */
export const conColacion = (s: Semana, dias: readonly DiaSemana[], colacion: Tramo | undefined): Aplicacion =>
  sobre(s, dias, (d) => {
    const l = limites(d);
    if (!l) return undefined;
    if (!colacion) return d.estado === 'abierto' ? { estado: 'abierto', tramos: [{ desde: l.desde, hasta: l.hasta }] } : d;
    if (colacion.desde <= l.desde || colacion.hasta >= l.hasta || colacion.desde >= colacion.hasta) return undefined;
    return { estado: 'abierto', tramos: [{ desde: l.desde, hasta: colacion.desde }, { desde: colacion.hasta, hasta: l.hasta }] };
  });

/** Horario completo escrito a mano: apertura, cierre y, si hay, colación. */
export const personalizado = (s: Semana, dias: readonly DiaSemana[], p: { readonly abre: number; readonly cierra: number; readonly colacion?: Tramo }): Aplicacion =>
  sobre(s, dias, () => {
    if (p.abre >= p.cierra) return undefined;
    const c = p.colacion;
    if (!c) return { estado: 'abierto', tramos: [{ desde: p.abre, hasta: p.cierra }] };
    if (c.desde <= p.abre || c.hasta >= p.cierra || c.desde >= c.hasta) return undefined;
    return { estado: 'abierto', tramos: [{ desde: p.abre, hasta: c.desde }, { desde: c.hasta, hasta: p.cierra }] };
  });

/** Lo que se envía a la API: solo los días con dato. */
export const aDiasApi = (s: Semana): readonly DiaApi[] =>
  DIAS.flatMap(({ dia }) => {
    const d = s[dia];
    if (d.estado === 'sin-dato') return [];
    return [{ dia, cerrado: d.estado === 'cerrado', tramos: d.estado === 'abierto' ? d.tramos : [] }];
  });

export const desdeApi = (dias: readonly DiaApi[]): Semana => {
  const semana: Record<DiaSemana, DiaEstado> = { ...semanaVacia() };
  for (const d of dias) {
    if (d.dia < 0 || d.dia > 6) continue;
    semana[d.dia as DiaSemana] = d.cerrado ? { estado: 'cerrado' } : d.tramos.length > 0 ? { estado: 'abierto', tramos: d.tramos } : SIN_DATO;
  }
  return semana;
};

/** «Abre 10:00 · cierra 18:00», «Cerrado», «Sin dato», «10:00 a 13:00 y 14:00 a 18:00». */
export const resumenDia = (d: DiaEstado): string => {
  if (d.estado === 'sin-dato') return 'Sin dato';
  if (d.estado === 'cerrado') return 'Cerrado';
  const [a, b, c] = d.tramos;
  if (a && !b) {
    if (a.hasta >= FIN_DEL_DIA) return `Abre a las ${horaDeMinutos(a.desde)}`;
    if (a.desde <= 0) return `Cierra a las ${horaDeMinutos(a.hasta)}`;
    return `Abre ${horaDeMinutos(a.desde)} · cierra ${horaDeMinutos(a.hasta)}`;
  }
  const partes = [a, b, c].flatMap((t) => (t ? [`${horaDeMinutos(t.desde)} a ${horaDeMinutos(t.hasta)}`] : []));
  return partes.join(' y ');
};

/** Texto de los errores de la API ya está en español; esto solo valida lo mínimo antes de enviar. */
export const validarSemana = (s: Semana): Result<readonly DiaApi[], string> => {
  for (const { dia, largo } of DIAS) {
    const d = s[dia];
    if (d.estado !== 'abierto') continue;
    for (let i = 0; i < d.tramos.length; i++) {
      const t = d.tramos[i];
      if (!t || t.desde >= t.hasta) return err(`El ${largo} tiene un tramo con la hora de apertura después de la de cierre.`);
    }
  }
  return ok(aDiasApi(s));
};
