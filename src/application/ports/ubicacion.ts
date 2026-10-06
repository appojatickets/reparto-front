import type { Result } from '../../domain/result';

export type Posicion = { readonly lat: number; readonly lng: number; readonly precisionM: number; readonly velocidadMs?: number };
export type ErrorUbicacion = 'PERMISO' | 'NO_DISPONIBLE' | 'TIEMPO';

/** GPS del teléfono: una lectura puntual (al llegar, al entregar o cada minuto mientras la app está abierta; ADR 0013). */
export interface Ubicacion {
  readonly disponible: boolean;
  actual(): Promise<Result<Posicion, ErrorUbicacion>>;
}
