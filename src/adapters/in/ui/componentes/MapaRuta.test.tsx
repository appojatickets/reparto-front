import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VistaRuta } from '../../../../application/modelos';
import { MapaRuta, MapaGuardadoOffline } from './MapaRuta';
import { leerMapa } from './mapa-cache';
const api = vi.hoisted(() => ({ verTrazado: vi.fn() }));
vi.mock('../contexto', () => ({ useCasos: () => ({ api, ahora: () => new Date('2026-10-18T10:00:00Z') }) }));
vi.mock('../sesion', () => ({ useUsuario: () => ({ id: 'u1' }) }));
vi.mock('./MapaInteractivo', () => ({ default: ({ vista }: { vista: VistaRuta }) => <div>Mapa listo versión {vista.version}</div> }));
const vista: VistaRuta = { camionId: 'cam-1', fecha: '2026-10-18', version: 1, planificada: true, salidaMin: 480, horaLimiteRegresoMin: 1260, paradas: [], nuevas: [], hechas: [], sinPin: [], noAtendidas: [], enRiesgo: [] };
beforeEach(() => { localStorage.clear(); api.verTrazado.mockReset(); });
afterEach(() => { cleanup(); });
describe('mapa de puntos sin líneas', () => {
  it('abre sin consultar recorridos y guarda solo la vista y los puntos', async () => {
    const { unmount } = render(<MapaRuta vista={vista} />);
    await userEvent.click(screen.getByRole('button', { name: 'VER MAPA DE MI RUTA' }));
    expect(await screen.findByText('Mapa listo versión 1')).toBeInTheDocument();
    expect(api.verTrazado).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR RUTA EN ESTE DISPOSITIVO' }));
    expect(leerMapa('u1')?.vista.version).toBe(1);
    expect(leerMapa('u1')?.trazado.tramos).toEqual([]);
    unmount();
    render(<MapaGuardadoOffline />);
    expect(await screen.findByText(/Consulta sin conexión/)).toBeInTheDocument();
  });
  it('actualiza los puntos directamente al cambiar la ruta, sin depender del proveedor', async () => {
    const { rerender } = render(<MapaRuta vista={vista} />);
    await userEvent.click(screen.getByRole('button', { name: 'VER MAPA DE MI RUTA' }));
    await screen.findByText('Mapa listo versión 1');
    rerender(<MapaRuta vista={{ ...vista, version: 2 }} />);
    expect(await screen.findByText('Mapa listo versión 2')).toBeInTheDocument();
    expect(api.verTrazado).not.toHaveBeenCalled();
  });
});
