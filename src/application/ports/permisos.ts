export type EstadoPermiso = 'concedido' | 'denegado' | 'pendiente';
export type EstadoPermisos = { readonly ubicacion: EstadoPermiso; readonly microfono: EstadoPermiso };

/** Permisos del teléfono que la app necesita desde el primer momento: ubicación (llegadas y ruta) y micrófono (dictado). */
export interface Permisos {
  /** Qué está concedido, denegado o aún sin preguntar. */
  estado(): Promise<EstadoPermisos>;
  /** Pregunta lo que falta (el navegador muestra su aviso) y devuelve cómo quedó. Nunca falla: si no se puede, queda como estaba. */
  pedir(): Promise<EstadoPermisos>;
}
