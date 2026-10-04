import type { Tokens } from '../../../application/modelos';
import type { SesionStore } from '../../../application/ports/sesion-store';

const CLAVE = 'reparto.sesion.v1';

const esTokens = (x: unknown): x is Tokens =>
  typeof x === 'object' && x !== null && typeof (x as Tokens).accessToken === 'string' && typeof (x as Tokens).refreshToken === 'string';

/** Guarda la sesión en el dispositivo. Si el almacenamiento no está disponible (modo privado), cae a memoria. */
type Almacen = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** `localStorage` lanza al leerlo en algunos modos privados o con cookies bloqueadas. */
const almacenDelNavegador = (): Almacen | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

export const crearSesionStore = (almacen: Almacen | undefined = almacenDelNavegador()): SesionStore => {
  let enMemoria: Tokens | undefined;
  return {
    cargar: () => {
      try {
        const crudo = almacen?.getItem(CLAVE);
        if (crudo) {
          const t: unknown = JSON.parse(crudo);
          if (esTokens(t)) return t;
        }
      } catch {
        // almacenamiento no disponible o contenido corrupto
      }
      return enMemoria;
    },
    guardar: (t) => {
      enMemoria = t;
      try {
        almacen?.setItem(CLAVE, JSON.stringify(t));
      } catch {
        // se queda en memoria
      }
    },
    borrar: () => {
      enMemoria = undefined;
      try {
        almacen?.removeItem(CLAVE);
      } catch {
        // nada que borrar
      }
    },
  };
};
