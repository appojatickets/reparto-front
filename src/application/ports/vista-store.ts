/** Cómo se ve la app: «grande» (letra y botones grandes, para ver mejor) o «normal» (más datos en la pantalla). */
export type Vista = 'grande' | 'normal';

/** Recuerda la elección en este teléfono. */
export interface VistaStore {
  cargar(): Vista | undefined;
  guardar(v: Vista): void;
}
