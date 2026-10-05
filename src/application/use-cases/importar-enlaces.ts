import type { EntradaEnlace } from '../../domain/lista-enlaces';
import { mensajeDeError } from '../mensajes';
import type { ApiClient } from '../ports/api-client';

export type FalloEnlace = { readonly numero: number; readonly direccion: string; readonly mensaje: string };
export type ResultadoEnlaces = {
  readonly total: number;
  readonly creados: number;
  readonly yaExistian: number;
  /** El enlace trajo el lugar exacto y quedó como pin del local. */
  readonly pinesFijados: number;
  /** El local ya tenía un pin validado por una persona: el del enlace quedó como propuesta para revisar. */
  readonly pinesPropuestos: number;
  /** Sin enlace con lugar (búsqueda por dirección): el sistema busca el pin solo. */
  readonly porBuscar: number;
  /** El cliente quedó cargado pero el enlace no se pudo leer. */
  readonly pinesNoLeidos: readonly FalloEnlace[];
  /** No se pudo ni cargar el cliente (se puede volver a importar: no duplica). */
  readonly fallos: readonly FalloEnlace[];
};
export type AvanceEnlaces = { readonly procesadas: number; readonly total: number };

/** Pocas a la vez: el servidor gratuito tiene poca CPU y leer un enlace corto de Google le toma hasta unos segundos. */
export const CONCURRENCIA_ENLACES = 3;

/**
 * Carga una lista de direcciones con enlace de Google Maps: por cada una crea el cliente (la razón social es la dirección,
 * como cuando el chofer registra uno nuevo; se cruza con RUT y nombre después) y, si el enlace trae el lugar, lo fija como pin.
 * Reimportar es seguro: lo que ya existe se completa, nunca se duplica.
 */
export const crearImportarEnlaces = ({ api }: { api: ApiClient }) =>
  async (entradas: readonly EntradaEnlace[], alAvanzar?: (a: AvanceEnlaces) => void, concurrencia = CONCURRENCIA_ENLACES): Promise<ResultadoEnlaces> => {
    const lista = entradas.filter((e) => e.estado === 'lista' && e.direccion !== undefined && e.comuna !== undefined);
    let creados = 0;
    let yaExistian = 0;
    let pinesFijados = 0;
    let pinesPropuestos = 0;
    let porBuscar = 0;
    const pinesNoLeidos: FalloEnlace[] = [];
    const fallos: FalloEnlace[] = [];
    let procesadas = 0;
    let siguiente = 0;

    const procesar = async (e: EntradaEnlace): Promise<void> => {
      const direccion = e.direccion ?? '';
      const c = await api.crearCliente({ razonSocial: direccion, direccion, comuna: e.comuna ?? '' });
      if (!c.ok) {
        fallos.push({ numero: e.numero, direccion, mensaje: mensajeDeError(c.error) });
        return;
      }
      if (c.value.existente) yaExistian++;
      else creados++;
      if (e.enlace === undefined || e.tipoEnlace === 'busqueda') {
        porBuscar++;
        return;
      }
      const p = await api.fijarPinDesdeEnlace(c.value.localId, e.enlace);
      if (!p.ok) pinesNoLeidos.push({ numero: e.numero, direccion, mensaje: mensajeDeError(p.error) });
      else if (p.value.resultado === 'fijado') pinesFijados++;
      else pinesPropuestos++;
    };

    const trabajador = async (): Promise<void> => {
      for (;;) {
        const e = lista[siguiente++];
        if (e === undefined) return;
        await procesar(e);
        procesadas++;
        alAvanzar?.({ procesadas, total: lista.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrencia, lista.length) }, trabajador));
    return { total: lista.length, creados, yaExistian, pinesFijados, pinesPropuestos, porBuscar, pinesNoLeidos, fallos };
  };
