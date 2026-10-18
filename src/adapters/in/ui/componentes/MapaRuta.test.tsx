import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VistaRuta } from '../../../../application/modelos';
import { ok } from '../../../../domain/result';
import { MapaRuta, MapaGuardadoOffline } from './MapaRuta';
import { leerMapa } from './mapa-cache';
const api = vi.hoisted(() => ({ verTrazado: vi.fn() }));
vi.mock('../contexto', () => ({ useCasos: () => ({ api, ahora: () => new Date('2026-10-18T10:00:00Z') }) }));
vi.mock('../sesion', () => ({ useUsuario: () => ({ id: 'u1' }) }));
vi.mock('./MapaInteractivo', () => ({ default: () => <div>Mapa listo</div> }));
const vista: VistaRuta = { camionId: 'cam-1', fecha: '2026-10-18', version: 1, planificada: true, salidaMin: 480, horaLimiteRegresoMin: 1260, paradas: [], nuevas: [], hechas: [], sinPin: [], noAtendidas: [], enRiesgo: [] };
beforeEach(() => { localStorage.clear(); api.verTrazado.mockReset(); });
afterEach(() => { cleanup(); });
describe('mapa en la ruta del chofer', () => {
  it('solo consulta al abrir, guarda la copia y permite verla sin red', async () => {
    api.verTrazado.mockResolvedValue(ok({ version: 1, perfil: 'driving-car', tramos: [] }));
    const { unmount } = render(<MapaRuta vista={vista} />);
    expect(api.verTrazado).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'VER MAPA DE MI RUTA' }));
    expect(await screen.findByText('Mapa listo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR RUTA EN ESTE DISPOSITIVO' }));
    expect(leerMapa('u1')?.vista.version).toBe(1);
    unmount();
    render(<MapaGuardadoOffline />);
    expect(await screen.findByText(/Consulta sin conexión/)).toBeInTheDocument();
    expect(api.verTrazado).toHaveBeenCalledTimes(1);
  });
  it('no mezcla marcadores viejos con el trazado de una versión posterior', async () => {
    api.verTrazado.mockResolvedValue(ok({ version: 2, perfil: 'driving-car', tramos: [] }));
    render(<MapaRuta vista={vista} />);
    await userEvent.click(screen.getByRole('button', { name: 'VER MAPA DE MI RUTA' }));
    expect(await screen.findByText(/La ruta cambió durante la consulta/)).toBeInTheDocument();
  });
  it('recarga el recorrido cuando cambia el orden de la ruta', async () => {
    api.verTrazado.mockResolvedValue(ok({ version: 1, perfil: 'driving-car', tramos: [] }));
    const { rerender } = render(<MapaRuta vista={vista} />);
    await userEvent.click(screen.getByRole('button', { name: 'VER MAPA DE MI RUTA' }));
    await screen.findByText('Mapa listo');
    api.verTrazado.mockResolvedValue(ok({ version: 2, perfil: 'driving-car', tramos: [] }));
    rerender(<MapaRuta vista={{ ...vista, version: 2 }} />);
    await waitFor(() => { expect(api.verTrazado).toHaveBeenCalledTimes(2); });
  });
});
