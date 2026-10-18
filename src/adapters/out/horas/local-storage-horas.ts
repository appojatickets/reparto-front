import type { HorasStore } from '../../../application/ports/horas-store';

const CLAVE = 'reparto.horas.v1';
type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

const almacenDelNavegador = (): Almacen | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

/** Recuerda en el dispositivo si se ven las horas estimadas; sin almacenamiento, solo mientras la app esté abierta. Por defecto no se ven. */
export const crearHorasStore = (almacen: Almacen | undefined = almacenDelNavegador()): HorasStore => {
  let enMemoria = false;
  return {
    cargar: () => {
      try {
        const v = almacen?.getItem(CLAVE);
        if (v === 'si') return true;
        if (v === 'no') return false;
      } catch {
        /* sin almacenamiento */
      }
      return enMemoria;
    },
    guardar: (ver) => {
      enMemoria = ver;
      try {
        almacen?.setItem(CLAVE, ver ? 'si' : 'no');
      } catch {
        /* sin almacenamiento: queda en memoria */
      }
    },
  };
};
