import { comunaDeDireccionOsm } from '../../../domain/comunas';
import { err, ok } from '../../../domain/result';
import type { Geocodificador } from '../../../application/ports/geocodificador';

/**
 * Geocodificación inversa con Nominatim (OpenStreetMap). Su política pide como máximo una consulta por segundo (lo cuida el caso de
 * uso) y solo se envían las coordenadas, nunca nombres ni direcciones de clientes.
 */
export const crearNominatim = (buscar: typeof fetch = (...a) => fetch(...a), tiempoMs = 10_000): Geocodificador => ({
  async comunaDe(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=10&accept-language=es&lat=${lat}&lon=${lng}`;
    let respuesta: Response;
    try {
      respuesta = await buscar(url, { signal: AbortSignal.timeout(tiempoMs), headers: { accept: 'application/json' } });
    } catch {
      return err('RED');
    }
    if (respuesta.status === 429 || respuesta.status === 403) return err('LIMITE');
    if (!respuesta.ok) return err('RED');
    let cuerpo: unknown;
    try {
      cuerpo = await respuesta.json();
    } catch {
      return err('RED');
    }
    const direccion = typeof cuerpo === 'object' && cuerpo !== null && 'address' in cuerpo ? (cuerpo).address : undefined;
    if (typeof direccion !== 'object' || direccion === null) return err('SIN_RESULTADO');
    const comuna = comunaDeDireccionOsm(direccion as Record<string, unknown>);
    return comuna === undefined ? err('SIN_RESULTADO') : ok(comuna);
  },
});
