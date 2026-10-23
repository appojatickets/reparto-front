import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Posicion, ErrorUbicacion, Ubicacion } from '../../../../application/ports/ubicacion';
import { ok } from '../../../../domain/result';
import type { VistaRuta, ParadaDeRuta } from '../../../../application/modelos';
import MapaInteractivo from './MapaInteractivo';
const dibujo = vi.hoisted(() => ({ crear: vi.fn(), encuadrar: vi.fn(), quitar: vi.fn(), centrar: vi.fn(), coordenadas: vi.fn(), puntos: [] as HTMLElement[] }));
vi.mock('maplibre-gl', () => ({
  setWorkerUrl: vi.fn(), NavigationControl: class { onAdd() { return document.createElement('div'); } },
  Map: class { constructor() { dibujo.crear(); } addControl() {} easeTo(p: unknown) { dibujo.centrar(p); } on() {} fitBounds() { dibujo.encuadrar(); } remove() { dibujo.quitar(); } },
  Marker: class {
    element: HTMLElement;
    constructor({ element }: { element: HTMLElement }) { this.element = element; dibujo.puntos.push(element); }
    setLngLat(p: unknown) { dibujo.coordenadas(this.element.textContent, p); return this; } setPopup() { return this; } addTo() { return this; }
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

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const punto = { lat: -33.51, lng: -70.61, precisionM: 12 };
const seguimiento = () => {
  let recibir!: (p: Posicion) => void;
  let fallar!: (e: ErrorUbicacion) => void;
  const detener = vi.fn();
  const ubicacion: Ubicacion = { disponible: true, actual: vi.fn(), seguir: (p, e) => { recibir = p; fallar = e; return detener; } };
  return { ubicacion, detener, recibir: (p: Posicion) => { act(() => { recibir(p); }); }, fallar: (e: ErrorUbicacion) => { act(() => { fallar(e); }); } };
};
it('mueve un solo marcador GPS, centra a pedido y lo conserva al reordenar', () => {
  const gps = seguimiento();
  const { rerender, unmount } = render(<MapaInteractivo vista={vista} ubicacion={gps.ubicacion} />);
  expect(screen.getByRole('button', { name: 'MI UBICACIÓN' })).toBeDisabled();
  gps.recibir(punto);
  gps.recibir({ ...punto, lat: -33.52 });
  expect(dibujo.puntos.filter(p => p.textContent === 'Tú')).toHaveLength(1);
  expect(dibujo.coordenadas).toHaveBeenLastCalledWith('Tú', [-70.61, -33.52]);
  expect(dibujo.centrar).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'MI UBICACIÓN' }));
  expect(dibujo.centrar).toHaveBeenCalledWith({ center: [-70.61, -33.52], zoom: 16 });
  rerender(<MapaInteractivo vista={{ ...vista, paradas: [parada('B', 0)] }} ubicacion={gps.ubicacion} />);
  expect(dibujo.puntos.map(p => p.textContent)).toEqual(['Tú', '1']);
  expect(dibujo.encuadrar).toHaveBeenCalledTimes(1);
  unmount();
  expect(gps.detener).toHaveBeenCalledOnce();
  gps.recibir(punto);
  expect(dibujo.puntos).toHaveLength(0);
});
it('retira posiciones con error o GPS antiguo y recupera con una nueva lectura', () => {
  vi.useFakeTimers();
  const gps = seguimiento();
  render(<MapaInteractivo vista={vista} ubicacion={gps.ubicacion} />);
  gps.recibir(punto);
  gps.fallar('PERMISO');
  expect(screen.getByText(/Permite el acceso a tu ubicación/)).toBeInTheDocument();
  expect(dibujo.puntos.some(p => p.textContent === 'Tú')).toBe(false);
  gps.recibir(punto);
  act(() => { vi.advanceTimersByTime(60_000); });
  expect(screen.getByText(/Sin señal GPS reciente/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'MI UBICACIÓN' })).toBeDisabled();
  gps.recibir(punto);
  expect(screen.getByText(/precisión aproximada de 12 m/)).toBeInTheDocument();
});
it('consulta cada cinco segundos sin seguimiento nativo y deja de consultar al cerrar', async () => {
  vi.useFakeTimers();
  const actual = vi.fn().mockResolvedValue(ok(punto));
  const { unmount } = render(<MapaInteractivo vista={vista} ubicacion={{ disponible: true, actual }} />);
  await act(async () => { await Promise.resolve(); });
  expect(actual).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
  expect(actual).toHaveBeenCalledTimes(2);
  expect(dibujo.puntos.some(p => p.textContent === 'Tú')).toBe(true);
  unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
  expect(actual).toHaveBeenCalledTimes(2);
});
