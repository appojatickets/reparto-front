import { COLUMNAS, type FormatoCsv, type IdColumna } from '../../../domain/exportacion';
import type { ExportacionStore, PreferenciaExportacion } from '../../../application/ports/exportacion-store';

const CLAVE = 'reparto.exportacion.v1';
type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

const almacenDelNavegador = (): Almacen | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

const IDS: ReadonlySet<string> = new Set(COLUMNAS.map((c) => c.id));
const esColumna = (x: unknown): x is IdColumna => typeof x === 'string' && IDS.has(x);
const esFormato = (x: unknown): x is FormatoCsv => x === 'excel' || x === 'estandar';

const leer = (texto: string | null | undefined): PreferenciaExportacion | undefined => {
  if (!texto) return undefined;
  try {
    const x: unknown = JSON.parse(texto);
    if (typeof x !== 'object' || x === null) return undefined;
    const { columnas, formato } = x as { columnas?: unknown; formato?: unknown };
    if (!Array.isArray(columnas) || !esFormato(formato)) return undefined;
    const validas = columnas.filter(esColumna);
    return validas.length > 0 ? { columnas: validas, formato } : undefined;
  } catch {
    return undefined;
  }
};

/** Recuerda las columnas y el formato elegidos en este dispositivo; sin almacenamiento, solo mientras la app esté abierta. */
export const crearExportacionStore = (almacen: Almacen | undefined = almacenDelNavegador()): ExportacionStore => {
  let enMemoria: PreferenciaExportacion | undefined;
  return {
    cargar: () => {
      try {
        const p = leer(almacen?.getItem(CLAVE));
        if (p) return p;
      } catch {
        /* sin almacenamiento */
      }
      return enMemoria;
    },
    guardar: (p) => {
      enMemoria = p;
      try {
        almacen?.setItem(CLAVE, JSON.stringify(p));
      } catch {
        /* sin almacenamiento: queda en memoria */
      }
    },
  };
};
