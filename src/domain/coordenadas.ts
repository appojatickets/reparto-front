export type Punto = { readonly lat: number; readonly lng: number };

/** Caja aproximada de la Región Metropolitana (detecta errores de tipeo, no es un límite legal). */
const dentroDeRM = (p: Punto): boolean => p.lat >= -34.3 && p.lat <= -32.9 && p.lng >= -71.75 && p.lng <= -69.8;

/**
 * Lee «-33.4372, -70.6506» (lo que se copia con un toque largo en Google Maps) con coma o espacio, y decimal con punto o coma.
 * Devuelve undefined si no son dos números o quedan fuera de la Región Metropolitana.
 */
export const leerCoordenadas = (texto: string): Punto | undefined => {
  const numeros = texto.trim().match(/-?\d+(?:[.,]\d+)?/g);
  if (numeros?.length !== 2) return undefined;
  const [lat, lng] = numeros.map((n) => Number(n.replace(',', '.')));
  if (lat === undefined || lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  const punto = { lat, lng };
  return dentroDeRM(punto) ? punto : undefined;
};

export const textoCoordenadas = (p: Punto): string => `${p.lat}, ${p.lng}`;
