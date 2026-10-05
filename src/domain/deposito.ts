import { distanciaKm } from './comunas';

/** A cuántos metros del depósito se considera que el camión llegó. */
export const RADIO_DEPOSITO_M = 150;

/**
 * El camión llegó al depósito. La precisión del GPS se tolera hasta cierto punto: con una lectura muy imprecisa (más de 100 m de error)
 * no se afirma nada, para no terminar la ruta por un salto del GPS.
 */
export const llegoAlDeposito = (posicion: { readonly lat: number; readonly lng: number; readonly precisionM: number }, deposito: { readonly lat: number; readonly lng: number }, radioM = RADIO_DEPOSITO_M): boolean =>
  posicion.precisionM <= 100 && distanciaKm([posicion.lat, posicion.lng], [deposito.lat, deposito.lng]) * 1000 <= radioM;
