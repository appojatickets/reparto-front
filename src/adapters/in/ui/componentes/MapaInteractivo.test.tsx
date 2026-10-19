import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { VistaRuta, ParadaDeRuta } from '../../../../application/modelos';
import MapaInteractivo from './MapaInteractivo';
const dibujo = vi.hoisted(() => ({ crear: vi.fn(), encuadrar: vi.fn(), quitar: vi.fn(), puntos: [] as HTMLElement[] }));
vi.mock('maplibre-gl', () => ({
  setWorkerUrl: vi.fn(), NavigationControl: class { onAdd() { return document.createElement('div'); } },
  Map: class { constructor() { dibujo.crear(); } addControl() {} on() {} fitBounds() { dibujo.encuadrar(); } remove() { dibujo.quitar(); } },
  Marker: class {
    element: HTMLElement;
    constructor({ element }: { element: HTMLElement }) { this.element = element; dibujo.puntos.push(element); }
    setLngLat() { return this; } setPopup() { return this; } addTo() { return this; }
    remove() { const i = dibujo.puntos.indexOf(this.element); if (i >= 0) dibujo.puntos.splice(i, 1); }
  },
  Popup: class { setDOMContent() { return this; } },
  LngLatBounds: class { vacio = true; extend() { this.vacio = false; } isEmpty() { return this.vacio; } },
}));
const parada = (id: string, posicion: number): ParadaDeRuta => ({ facturaId: id, localId: id, cliente: id, direccion: `Calle ${id}`, comuna: 'Maipú', urgente: false, posicion, llegada: 600, inicioServicio: 600, salida: 605, espera: 0, atraso: 0, motivos: [], fijada: false, lat: -33.5, lng: -70.6 });
const vista: VistaRuta = { camionId: 'c1', fecha: '2026-10-19', version: 1, planificada: true, salidaMin: 480, horaLimiteRegresoMin: 1260, paradas: [parada('A', 0), parada('B', 1)], nuevas: [], hechas: [], sinPin: [], noAtendidas: [], enRiesgo: [] };
describe('actualización del mapa conservando el zoom', () => {
  it('renumera según la misma lista incluso sin cambio de versión y elimina puntos de entregas hechas', () => {
    const { rerender, unmount } = render(<MapaInteractivo vista={vista} />);
    expect(dibujo.puntos.map((e) => e.getAttribute('aria-label'))).toEqual(['1. A', '2. B']);
    rerender(<MapaInteractivo vista={{ ...vista, paradas: [parada('B', 0), parada('A', 1)] }} />);
    expect(dibujo.puntos.map((e) => e.getAttribute('aria-label'))).toEqual(['1. B', '2. A']);
    rerender(<MapaInteractivo vista={{ ...vista, version: 2, paradas: [parada('B', 0)] }} />);
    expect(dibujo.puntos.map((e) => e.getAttribute('aria-label'))).toEqual(['1. B']);
    expect(dibujo.crear).toHaveBeenCalledTimes(1);
    expect(dibujo.encuadrar).toHaveBeenCalledTimes(1);
    unmount();
    expect(dibujo.quitar).toHaveBeenCalledTimes(1);
    expect(dibujo.puntos).toHaveLength(0);
  });
});
