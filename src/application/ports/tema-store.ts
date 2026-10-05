/** Colores de la app: «claro» (fondo blanco) u «oscuro» (fondo negro, mejor de noche o con poca luz). */
export type Tema = 'claro' | 'oscuro';

/** Recuerda la elección en este teléfono. Sin elección, la app sigue el modo del teléfono. */
export interface TemaStore {
  cargar(): Tema | undefined;
  guardar(t: Tema): void;
}
