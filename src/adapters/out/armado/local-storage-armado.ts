import type { Armado, ArmadoStore } from '../../../application/ports/armado-store';

const CLAVE = 'reparto.armado.v1';
type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

const almacenDelNavegador = (): Almacen | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

const esArmado = (x: unknown): x is Armado => x === 'calcular' || x === 'carga';

/** Guarda cómo prefiere armar su ruta en el dispositivo; si el almacenamiento no está disponible, la recuerda solo mientras la app esté abierta. */
export const crearArmadoStore = (almacen: Almacen | undefined = almacenDelNavegador()): ArmadoStore => {
  let enMemoria: Armado | undefined;
  return {
    cargar: () => {
      try {
        const v = almacen?.getItem(CLAVE);
        if (esArmado(v)) return v;
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
