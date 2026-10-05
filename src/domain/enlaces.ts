/** Enlaces con las coordenadas del pin. Sin pin, la navegación usa la dirección escrita (con la comuna). */
export const enlaceWaze = (lat: number, lng: number): string => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

export const enlaceGoogleMaps = (lat: number, lng: number): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

/** De Street View solo se guarda la referencia (lat, lng, rumbo), nunca la imagen. */
export const enlaceStreetView = (lat: number, lng: number, rumbo = 0): string =>
  `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}&heading=${rumbo}`;

export type Destino = { readonly direccion: string; readonly comuna: string; readonly lat?: number | undefined; readonly lng?: number | undefined };
export type AppMapa = 'waze' | 'google';

const textoDeDireccion = (d: Destino): string => `${d.direccion}, ${d.comuna}, Chile`;
const punto = (d: Destino): string => (d.lat !== undefined && d.lng !== undefined ? `${d.lat},${d.lng}` : textoDeDireccion(d));

/** Abre Waze o Google Maps en esa parada: con el pin si lo tiene y, si no, con la dirección y la comuna. */
export const enlaceNavegar = (d: Destino, app: AppMapa): string => {
  if (d.lat !== undefined && d.lng !== undefined) return app === 'waze' ? enlaceWaze(d.lat, d.lng) : enlaceGoogleMaps(d.lat, d.lng);
  const q = encodeURIComponent(textoDeDireccion(d));
  return app === 'waze' ? `https://waze.com/ul?q=${q}&navigate=yes` : `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving`;
};

/** Google Maps acepta varias paradas de una vez: las próximas en el orden de la ruta (hasta 9, la última es el destino). */
export const enlaceRutaGoogleMaps = (paradas: readonly Destino[], maximo = 9): string | undefined => {
  const tramo = paradas.slice(0, maximo);
  const ultimo = tramo[tramo.length - 1];
  if (!ultimo) return undefined;
  const intermedias = tramo.slice(0, -1).map((d) => encodeURIComponent(punto(d))).join('%7C');
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(punto(ultimo))}${intermedias ? `&waypoints=${intermedias}` : ''}&travelmode=driving`;
};

/** WhatsApp con el mensaje ya escrito. Con teléfono abre ese chat; sin él, deja elegir el contacto. */
export const enlaceWhatsApp = (mensaje: string, telefono?: string): string => {
  const digitos = (telefono ?? '').replace(/\D/g, '');
  const numero = digitos.length === 9 && digitos.startsWith('9') ? `56${digitos}` : digitos;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
};

const ubicacionDe = (d: Destino): string => (d.lat !== undefined && d.lng !== undefined ? ` Ubicación: https://www.google.com/maps?q=${d.lat},${d.lng}` : '');

/** «Calle A 100, San Bernardo» y, si hay nombre, «(nombre)»: la dirección siempre está; el nombre solo si se conoce, sin huecos. */
const lugarDe = (d: Destino, nombre?: string): string => {
  const n = (nombre ?? '').replace(/\s+/g, ' ').trim();
  return `${d.direccion}, ${d.comuna}${n === '' ? '' : ` (${n})`}`;
};

/** Mensaje para el vendedor cuando el local está cerrado. `nombre` es el que sale en la guía (así los vendedores conocen al cliente). */
export const mensajeLocalCerrado = (d: Destino & { readonly nombre?: string }, hora: string): string =>
  `Hola, estoy en ${lugarDe(d, d.nombre)} y está cerrado (${hora}). ¿Puedes llamarlo para ver si abre o si espero?${ubicacionDe(d)}`;

/** Mensaje cuando el chofer no encuentra la dirección. */
export const mensajeDireccionNoEncontrada = (d: Destino & { readonly nombre?: string }): string =>
  `Hola, no encuentro la dirección ${lugarDe(d, d.nombre)}. ¿Me ayudas con la ubicación exacta?${ubicacionDe(d)}`;
