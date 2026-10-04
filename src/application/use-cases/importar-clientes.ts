import { err, ok, type Result } from '../../domain/result';
import type { FilaCliente, ErrorFila, ResultadoImportacion, ResumenImportacion } from '../modelos';
import type { ApiClient, ApiError } from '../ports/api-client';

export const TAMANO_LOTE = 500;
export type FalloImportacion = { readonly error: ApiError; readonly procesadas: number; readonly parcial: ResultadoImportacion };
export type Progreso = { readonly procesadas: number; readonly total: number };

const vacio = (): ResumenImportacion => ({ clientesCreados: 0, clientesActualizados: 0, localesCreados: 0, localesActualizados: 0 });

/**
 * Manda la planilla por lotes (la API acepta hasta 1.000 filas por llamada y Render Free tiene poca CPU).
 * Los números de fila de los errores se corrigen para que cuenten desde la primera fila de la planilla completa.
 * Si un lote falla por red o servidor, se detiene e informa cuánto alcanzó a procesar (reimportar es seguro).
 */
export const crearImportarClientesEnLotes = ({ api }: { api: ApiClient }) =>
  async (filas: readonly FilaCliente[], alAvanzar?: (p: Progreso) => void, tamano = TAMANO_LOTE): Promise<Result<ResultadoImportacion, FalloImportacion>> => {
    let resumen = vacio();
    let validas = 0;
    const errores: ErrorFila[] = [];
    const acumulado = (): ResultadoImportacion => ({ totalFilas: filas.length, validas, errores, resumen });

    for (let desde = 0; desde < filas.length; desde += tamano) {
      const lote = filas.slice(desde, desde + tamano);
      const r = await api.importarClientes(lote);
      if (!r.ok) return err({ error: r.error, procesadas: desde, parcial: acumulado() });
      validas += r.value.validas;
      errores.push(...r.value.errores.map((e) => ({ ...e, fila: e.fila + desde })));
      const s = r.value.resumen;
      resumen = {
        clientesCreados: resumen.clientesCreados + s.clientesCreados,
        clientesActualizados: resumen.clientesActualizados + s.clientesActualizados,
        localesCreados: resumen.localesCreados + s.localesCreados,
        localesActualizados: resumen.localesActualizados + s.localesActualizados,
      };
      alAvanzar?.({ procesadas: Math.min(desde + tamano, filas.length), total: filas.length });
    }
    return ok(acumulado());
  };
