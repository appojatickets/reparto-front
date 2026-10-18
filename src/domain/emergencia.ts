/** Kit de emergencia del chofer (ADR 0048 del back): números de Chile y búsqueda de ayuda en Google Maps. */

export type TelefonoEmergencia = { readonly nombre: string; readonly numero: string };

/** Números de emergencia de Chile, gratuitos y sin código de área. */
export const TELEFONOS_EMERGENCIA: readonly TelefonoEmergencia[] = [
  { nombre: 'CARABINEROS', numero: '133' },
  { nombre: 'PDI', numero: '134' },
  { nombre: 'BOMBEROS', numero: '132' },
  { nombre: 'AMBULANCIA', numero: '131' },
];

export const enlaceLlamar = (numero: string): string => `tel:${numero}`;

export type TipoEmergencia = 'mecanico' | 'vulcanizacion' | 'otro';

export const ETIQUETA_EMERGENCIA: Readonly<Record<TipoEmergencia, string>> = { mecanico: 'Mecánico', vulcanizacion: 'Vulcanización', otro: 'Otra ayuda' };

/** Lo que se escribe en el buscador de Maps según lo que se necesita. */
export const consultaDeEmergencia = (tipo: TipoEmergencia, texto = ''): string => {
  const libre = texto.replace(/\s+/g, ' ').trim();
  if (tipo === 'otro') return libre;
  return tipo === 'mecanico' ? 'mecánico automotriz' : 'vulcanización gomería';
};

/**
 * Abre Google Maps con esa búsqueda. Con la posición del camión el mapa queda centrado ahí (los resultados salen por cercanía); sin GPS se pide
 * «cerca de mí» y Maps usa la ubicación del teléfono.
 */
export const enlaceBuscarAyuda = (consulta: string, posicion?: { readonly lat: number; readonly lng: number }): string =>
  posicion
    ? `https://www.google.com/maps/search/${encodeURIComponent(consulta)}/@${posicion.lat.toFixed(6)},${posicion.lng.toFixed(6)},14z`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${consulta} cerca de mí`)}`;
