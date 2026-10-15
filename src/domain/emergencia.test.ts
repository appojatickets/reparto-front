import { describe, expect, it } from 'vitest';
import { consultaDeEmergencia, enlaceBuscarAyuda, enlaceLlamar, TELEFONOS_EMERGENCIA } from './emergencia';

describe('kit de emergencia', () => {
  it('trae Carabineros, PDI, Bomberos y ambulancia con los números de Chile', () => {
    expect(Object.fromEntries(TELEFONOS_EMERGENCIA.map((t) => [t.nombre, t.numero]))).toEqual({ CARABINEROS: '133', PDI: '134', BOMBEROS: '132', AMBULANCIA: '131' });
    expect(enlaceLlamar('133')).toBe('tel:133');
  });

  it('busca mecánico o vulcanización, o lo que el chofer escriba', () => {
    expect(consultaDeEmergencia('mecanico')).toBe('mecánico automotriz');
    expect(consultaDeEmergencia('vulcanizacion')).toBe('vulcanización gomería');
    expect(consultaDeEmergencia('otro', '  grúa   24 horas ')).toBe('grúa 24 horas');
  });

  it('con la posición del camión centra el mapa ahí; sin GPS pide «cerca de mí»', () => {
    expect(enlaceBuscarAyuda('mecánico automotriz', { lat: -33.5, lng: -70.7 })).toBe('https://www.google.com/maps/search/mec%C3%A1nico%20automotriz/@-33.500000,-70.700000,14z');
    expect(enlaceBuscarAyuda('grúa')).toBe('https://www.google.com/maps/search/?api=1&query=gr%C3%BAa%20cerca%20de%20m%C3%AD');
  });
});
