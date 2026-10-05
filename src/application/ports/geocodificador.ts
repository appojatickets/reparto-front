import type { Result } from '../../domain/result';

export type ErrorGeocodificador = 'RED' | 'LIMITE' | 'SIN_RESULTADO';

/** Dado un punto del mapa, dice en qué comuna de la Región Metropolitana está (servicio gratuito de OpenStreetMap). */
export interface Geocodificador {
  comunaDe(lat: number, lng: number): Promise<Result<string, ErrorGeocodificador>>;
}
