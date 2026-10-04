import type { Result } from '../../domain/result';

export type Posicion = { readonly lat: number; readonly lng: number; readonly precisionM: number };
export type ErrorUbicacion = 'PERMISO' | 'NO_DISPONIBLE' | 'TIEMPO';

/** GPS del teléfono: una lectura puntual al llegar o entregar (no hay seguimiento continuo; ADR 0009). */
export interface Ubicacion {
  readonly disponible: boolean;
  actual(): Promise<Result<Posicion, ErrorUbicacion>>;
}
