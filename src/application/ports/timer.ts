export type Cancel = () => void;

export interface Timer {
  /** Ejecuta `fn` tras `ms`. Devuelve una función para cancelar. */
  after(ms: number, fn: () => void): Cancel;
}
