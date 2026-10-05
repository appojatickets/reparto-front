import { comunaDeDireccionOsm } from '../../../domain/comunas';
import { err, ok } from '../../../domain/result';
import type { CandidatoDireccion, Geocodificador } from '../../../application/ports/geocodificador';

/**
 * Nominatim (OpenStreetMap). Su política pide como máximo una consulta por segundo (lo cuida el caso de uso) y prohíbe autocompletar
 * letra por letra. Para saber la comuna de un pin solo se envían las coordenadas; para buscar una dirección nueva se envía solo el texto
 * de la dirección (calle, número, comuna), nunca el nombre del cliente.
 */
const PRECISION_OSM: Readonly<Record<string, 'exacta' | 'calle'>> = {
  house: 'exacta', building: 'exacta', shop: 'exacta', amenity: 'exacta', office: 'exacta',
  road: 'calle', highway: 'calle', residential: 'calle', tertiary: 'calle', secondary: 'calle', primary: 'calle', unclassified: 'calle', service: 'calle', track: 'calle',
};
const RM = { oeste: -71.75, norte: -32.9, este: -69.8, sur: -34.3 };

type ResultadoOsm = { lat?: unknown; lon?: unknown; addresstype?: string; type?: string; address?: Record<string, unknown> };

const etiquetaDe = (r: ResultadoOsm, comuna: string | undefined): string => {
  const a = r.address ?? {};
  const calle = typeof a['road'] === 'string' ? a['road'] : undefined;
  const numero = typeof a['house_number'] === 'string' ? a['house_number'] : undefined;
  const via = [calle, numero].filter((x): x is string => x !== undefined).join(' ');
  return [via === '' ? undefined : via, comuna].filter((x): x is string => x !== undefined).join(', ') || 'Lugar sin nombre';
};

export const crearNominatim = (buscar: typeof fetch = (...a) => fetch(...a), tiempoMs = 10_000): Geocodificador => ({
  async buscarDirecciones(consulta) {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=cl&accept-language=es&viewbox=${RM.oeste},${RM.norte},${RM.este},${RM.sur}&bounded=1&q=${encodeURIComponent(consulta)}`;
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
    if (!Array.isArray(cuerpo)) return err('SIN_RESULTADO');
    const candidatos: CandidatoDireccion[] = [];
    for (const r of cuerpo as ResultadoOsm[]) {
      const lat = Number(r.lat);
      const lng = Number(r.lon);
      const precision = PRECISION_OSM[r.addresstype ?? ''] ?? PRECISION_OSM[r.type ?? ''];
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || precision === undefined) continue;
      const comuna = comunaDeDireccionOsm(r.address ?? {});
      candidatos.push({ lat, lng, precision, etiqueta: etiquetaDe(r, comuna), ...(comuna !== undefined ? { comuna } : {}) });
    }
    candidatos.sort((a, b) => Number(b.precision === 'exacta') - Number(a.precision === 'exacta'));
    return candidatos.length > 0 ? ok(candidatos) : err('SIN_RESULTADO');
  },

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
