import type { Tramo } from '../../domain/horario-semanal';
import { horarioDeNota, pareceHorario } from '../../domain/horario-nota';
import { mensajeDeError } from '../mensajes';
import type { ApiClient } from '../ports/api-client';

export type LocalConNota = { readonly localId: string; readonly razonSocial: string; readonly nota: string };
export type HorarioEntendido = LocalConNota & { readonly tramos: readonly Tramo[] };
export type RevisionDeNotas = { readonly entendidos: readonly HorarioEntendido[]; readonly sinEntender: readonly LocalConNota[]; readonly conNota: number };

/** Separa las notas que traen un horario claro de las que parecen horario pero no se entendieron (esas se dejan como están). */
export const revisarNotas = (locales: readonly LocalConNota[]): RevisionDeNotas => {
  const conNota = locales.filter((l) => l.nota.trim() !== '');
  const entendidos: HorarioEntendido[] = [];
  const sinEntender: LocalConNota[] = [];
  for (const l of conNota) {
    const tramos = horarioDeNota(l.nota);
    if (tramos) entendidos.push({ ...l, tramos });
    else if (pareceHorario(l.nota)) sinEntender.push(l);
  }
  return { entendidos, sinEntender, conNota: conNota.length };
};

export type ResultadoHorarios = { readonly aplicados: number; readonly yaTenian: number; readonly fallos: readonly { readonly razonSocial: string; readonly mensaje: string }[] };
export type AvanceHorarios = { readonly procesados: number; readonly total: number };

/** De lunes a sábado; el domingo queda sin dato (la nota no lo dice). */
const DIAS_DE_REPARTO = [1, 2, 3, 4, 5, 6] as const;

/**
 * Guarda el horario leído de la nota como horario de atención del local. Nunca pisa uno ya cargado a mano: si el local
 * ya tiene algún día con dato, se salta. De a pocos a la vez (el servidor gratuito tiene poca CPU).
 */
export const crearAplicarHorariosDeNotas = ({ api }: { api: ApiClient }) =>
  async (entendidos: readonly HorarioEntendido[], alAvanzar?: (a: AvanceHorarios) => void, concurrencia = 3): Promise<ResultadoHorarios> => {
    let aplicados = 0;
    let yaTenian = 0;
    const fallos: { razonSocial: string; mensaje: string }[] = [];
    let siguiente = 0;
    let procesados = 0;

    const procesar = async (h: HorarioEntendido): Promise<void> => {
      const actual = await api.obtenerHorario(h.localId);
      if (!actual.ok) {
        fallos.push({ razonSocial: h.razonSocial, mensaje: mensajeDeError(actual.error) });
        return;
      }
      if (actual.value.some((d) => d.cerrado || d.tramos.length > 0)) {
        yaTenian++;
        return;
      }
      const r = await api.guardarHorario(h.localId, DIAS_DE_REPARTO.map((dia) => ({ dia, cerrado: false, tramos: h.tramos })));
      if (r.ok) aplicados++;
      else fallos.push({ razonSocial: h.razonSocial, mensaje: mensajeDeError(r.error) });
    };

    const trabajador = async (): Promise<void> => {
      for (;;) {
        const h = entendidos[siguiente++];
        if (h === undefined) return;
        await procesar(h);
        procesados++;
        alAvanzar?.({ procesados, total: entendidos.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrencia, entendidos.length) }, trabajador));
    return { aplicados, yaTenian, fallos };
  };
