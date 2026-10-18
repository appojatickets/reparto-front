import type { Result } from '../../domain/result';

export type Posicion = { readonly lat: number; readonly lng: number; readonly precisionM: number; readonly velocidadMs?: number };
export type ErrorUbicacion = 'PERMISO' | 'NO_DISPONIBLE' | 'TIEMPO';

/** GPS del teléfono: una lectura puntual (al llegar, al entregar o cada minuto mientras la app está abierta; ADR 0013). */
export interface Ubicacion {
  readonly disponible: boolean;
  actual(): Promise<Result<Posicion, ErrorUbicacion>>;
  /**
   * Sigue el GPS en forma continua (cada vez que el teléfono tiene una lectura nueva) hasta que se llame a la función que devuelve.
   * Opcional: sin él, se lee cada minuto con `actual`.
   */
  seguir?(alPunto: (p: Posicion) => void, alError: (e: ErrorUbicacion) => void): () => void;
}

/** Mantiene la pantalla encendida mientras se usa (Wake Lock): con la pantalla apagada el navegador deja de leer el GPS. */
export interface PantallaEncendida {
  readonly disponible: boolean;
  /** Pide mantenerla encendida; devuelve false si el navegador no lo permite. Hay que volver a pedirlo al volver a la app. */
  mantener(): Promise<boolean>;
  soltar(): Promise<void>;
}
