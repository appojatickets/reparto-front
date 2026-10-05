import type { Tema, TemaStore } from '../../../application/ports/tema-store';

const CLAVE = 'reparto.tema.v1';
type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

const almacenDelNavegador = (): Almacen | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

const esTema = (x: unknown): x is Tema => x === 'claro' || x === 'oscuro';

/** Guarda el tema elegido en el dispositivo; si el almacenamiento no está disponible, lo recuerda solo mientras la app esté abierta. */
export const crearTemaStore = (almacen: Almacen | undefined = almacenDelNavegador()): TemaStore => {
  let enMemoria: Tema | undefined;
  return {
    cargar: () => {
      try {
        const v = almacen?.getItem(CLAVE);
        if (esTema(v)) return v;
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
