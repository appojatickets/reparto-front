import type { Result } from '../../domain/result';

export type ErrorGeocodificador = 'RED' | 'LIMITE' | 'SIN_RESULTADO';

/** Un lugar que el mapa propone para una dirección: el chofer elige el correcto. */
export type CandidatoDireccion = {
  readonly lat: number;
  readonly lng: number;
  /** Cómo se lo muestra a quien elige: «Avenida Colón Sur 765, San Bernardo». */
  readonly etiqueta: string;
  readonly comuna?: string;
  /** exacta: con el número de la calle · calle: la calle o el camino. */
  readonly precision: 'exacta' | 'calle';
};

/** Servicio gratuito de OpenStreetMap: de un punto saca su comuna y de una dirección saca los lugares posibles. */
export interface Geocodificador {
  comunaDe(lat: number, lng: number): Promise<Result<string, ErrorGeocodificador>>;
  /** Una consulta por toque de botón (nunca por letra escrita: el servicio gratuito lo prohíbe). Devuelve hasta 5 lugares. */
  buscarDirecciones(consulta: string): Promise<Result<readonly CandidatoDireccion[], ErrorGeocodificador>>;
}
