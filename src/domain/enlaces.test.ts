import { describe, expect, it } from 'vitest';
import { enlaceGoogleMaps, enlaceStreetView, enlaceWaze } from './enlaces';

describe('enlaces de navegación (con coordenadas, no con texto)', () => {
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
