import { describe, expect, it } from 'vitest';
import { enlaceGoogleMaps, enlaceNavegar, enlaceRutaGoogleMaps, enlaceStreetView, enlaceWaze, enlaceWhatsApp, mensajeDireccionNoEncontrada, mensajeLocalCerrado } from './enlaces';

describe('enlaces de navegación', () => {
  it('Waze', () => {
    expect(enlaceWaze(-33.4372, -70.6506)).toBe('https://waze.com/ul?ll=-33.4372,-70.6506&navigate=yes');
  });

  it('Google Maps', () => {
    expect(enlaceGoogleMaps(-33.4372, -70.6506)).toBe('https://www.google.com/maps/dir/?api=1&destination=-33.4372,-70.6506&travelmode=driving');
  });

  it('Street View solo como referencia (lat, lng, rumbo); sin rumbo apunta al norte', () => {
    expect(enlaceStreetView(-33.4372, -70.6506, 120)).toBe('https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=-33.4372,-70.6506&heading=120');
    expect(enlaceStreetView(-33.4372, -70.6506)).toContain('heading=0');
  });
});

const conPin = { direccion: 'Av. Colón Sur 765', comuna: 'San Bernardo', lat: -33.59, lng: -70.7 };
const sinPin = { direccion: 'Av. Colón Sur 765', comuna: 'San Bernardo' };

describe('navegar a una parada', () => {
  it('con pin usa las coordenadas', () => {
    expect(enlaceNavegar(conPin, 'waze')).toBe('https://waze.com/ul?ll=-33.59,-70.7&navigate=yes');
    expect(enlaceNavegar(conPin, 'google')).toContain('destination=-33.59,-70.7');
  });

  it('sin pin usa la dirección escrita con la comuna (codificada)', () => {
    expect(enlaceNavegar(sinPin, 'waze')).toBe('https://waze.com/ul?q=Av.%20Col%C3%B3n%20Sur%20765%2C%20San%20Bernardo%2C%20Chile&navigate=yes');
    expect(enlaceNavegar(sinPin, 'google')).toBe('https://www.google.com/maps/dir/?api=1&destination=Av.%20Col%C3%B3n%20Sur%20765%2C%20San%20Bernardo%2C%20Chile&travelmode=driving');
  });
});

describe('varias paradas en Google Maps', () => {
  it('la última del tramo es el destino y las anteriores van como paradas intermedias en orden', () => {
    const url = enlaceRutaGoogleMaps([conPin, { ...conPin, lat: -33.6, lng: -70.71 }, { ...conPin, lat: -33.61, lng: -70.72 }]) ?? '';
    expect(url).toContain('destination=-33.61%2C-70.72');
    expect(url).toContain('waypoints=-33.59%2C-70.7%7C-33.6%2C-70.71');
  });

  it('una sola parada no lleva paradas intermedias; sin paradas no hay enlace', () => {
    expect(enlaceRutaGoogleMaps([conPin])).not.toContain('waypoints');
    expect(enlaceRutaGoogleMaps([])).toBeUndefined();
  });

  it('se limita a 9 paradas (8 intermedias + destino) y mezcla pin con dirección escrita', () => {
    const doce = Array.from({ length: 12 }, (_, i) => ({ ...conPin, lat: -33.5 - i / 100 }));
    const url = enlaceRutaGoogleMaps(doce) ?? '';
    expect(url.split('%7C')).toHaveLength(8);
    expect(url).toContain('destination=-33.58%2C-70.7');
    expect(enlaceRutaGoogleMaps([sinPin, conPin])).toContain('waypoints=Av.%20Col');
  });
});

describe('WhatsApp', () => {
  it('con teléfono chileno de 9 dígitos agrega el 56; sin teléfono deja elegir el contacto', () => {
    expect(enlaceWhatsApp('hola', '9 1234 5678')).toBe('https://wa.me/56912345678?text=hola');
    expect(enlaceWhatsApp('hola', '+56 9 8765 4321')).toBe('https://wa.me/56987654321?text=hola');
    expect(enlaceWhatsApp('hola ¿qué tal?')).toBe('https://wa.me/?text=hola%20%C2%BFqu%C3%A9%20tal%3F');
  });

  it('los mensajes dicen quién, dónde y la hora, e incluyen la ubicación si hay pin', () => {
    const cerrado = mensajeLocalCerrado({ ...conPin, nombre: 'Rabelo' }, '11:40');
    expect(cerrado).toContain('Av. Colón Sur 765, San Bernardo (Rabelo) y está cerrado (11:40)');
    expect(cerrado).toContain('https://www.google.com/maps?q=-33.59,-70.7');
    expect(mensajeLocalCerrado({ ...sinPin, nombre: 'Rabelo' }, '11:40')).not.toContain('maps?q=');
    expect(mensajeDireccionNoEncontrada({ ...sinPin, nombre: 'Rabelo' })).toContain('no encuentro la dirección Av. Colón Sur 765, San Bernardo (Rabelo).');
  });

  it('sin nombre el mensaje se arma solo con la dirección, sin huecos ni paréntesis vacíos', () => {
    for (const nombre of [undefined, '', '   ']) {
      const m = mensajeLocalCerrado({ ...sinPin, ...(nombre !== undefined ? { nombre } : {}) }, '11:40');
      expect(m).toBe('Hola, estoy en Av. Colón Sur 765, San Bernardo y está cerrado (11:40). ¿Puedes llamarlo para ver si abre o si espero?');
    }
    expect(mensajeDireccionNoEncontrada(sinPin)).toBe('Hola, no encuentro la dirección Av. Colón Sur 765, San Bernardo. ¿Me ayudas con la ubicación exacta?');
  });

  it('el nombre se limpia de espacios repetidos', () => {
    expect(mensajeLocalCerrado({ ...sinPin, nombre: '  Minimarket   Rabelo ' }, '11:40')).toContain('(Minimarket Rabelo)');
  });
});
