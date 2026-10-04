import type { Tokens } from '../modelos';

/** Dónde se guarda la sesión del dispositivo (sesión larga: el chofer no debe reingresar cada día). */
export type SesionStore = {
  readonly cargar: () => Tokens | undefined;
  readonly guardar: (tokens: Tokens) => void;
  readonly borrar: () => void;
};
