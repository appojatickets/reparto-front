/** Enlaces con las coordenadas del pin validado (nunca con texto de dirección). */
export const enlaceWaze = (lat: number, lng: number): string => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

export const enlaceGoogleMaps = (lat: number, lng: number): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

/** De Street View solo se guarda la referencia (lat, lng, rumbo), nunca la imagen. */
export const enlaceStreetView = (lat: number, lng: number, rumbo = 0): string =>
  `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}&heading=${rumbo}`;
