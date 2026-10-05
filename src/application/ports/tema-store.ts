/** Colores de la app: «claro» (fondo blanco), «oscuro» (fondo negro, mejor de noche) o «suave» (tonos cálidos y de bajo brillo, para descansar la vista). */
export type Tema = 'claro' | 'oscuro' | 'suave';

/** Recuerda la elección en este teléfono. Sin elección, la app sigue el modo del teléfono. */
export interface TemaStore {
  cargar(): Tema | undefined;
  guardar(t: Tema): void;
}
