import type { Vista, VistaStore } from '../../../application/ports/vista-store';

const CLAVE = 'reparto.vista.v1';
type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

const almacenDelNavegador = (): Almacen | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

const esVista = (x: unknown): x is Vista => x === 'grande' || x === 'normal';

/** Guarda la vista elegida en el dispositivo; si el almacenamiento no está disponible, la recuerda solo mientras la app esté abierta. */
export const crearVistaStore = (almacen: Almacen | undefined = almacenDelNavegador()): VistaStore => {
  let enMemoria: Vista | undefined;
  return {
    cargar: () => {
      try {
        const v = almacen?.getItem(CLAVE);
        if (esVista(v)) return v;
      } catch {
        /* sin almacenamiento */
      }
      return enMemoria;
    },
    guardar: (v) => {
      enMemoria = v;
      try {
        almacen?.setItem(CLAVE, v);
      } catch {
        /* sin almacenamiento: queda en memoria */
      }
    },
  };
};
