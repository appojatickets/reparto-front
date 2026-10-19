import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from '../../../../domain/result';
import { SeguimientoAndroid } from './SeguimientoAndroid';
const deps = vi.hoisted(() => ({ api: { miJornada: vi.fn() }, seguimientoNativo: { estado: vi.fn(), iniciar: vi.fn(), detener: vi.fn() } }));
vi.mock('../contexto', () => ({ useCasos: () => deps }));
beforeEach(() => {
  vi.resetAllMocks();
  deps.seguimientoNativo.estado.mockResolvedValue({ activo: false, pendientes: 0 });
});
afterEach(() => { cleanup(); });
describe('GPS Android durante la jornada', () => {
  it('requiere una jornada antes de pedir iniciar el servicio', async () => {
    deps.api.miJornada.mockResolvedValue(ok(null));
    render(<SeguimientoAndroid />);
    await userEvent.click(screen.getByRole('button', { name: 'ACTIVAR GPS DE JORNADA' }));
    expect(await screen.findByText(/Primero elige el camión/)).toBeInTheDocument();
    expect(deps.seguimientoNativo.iniciar).not.toHaveBeenCalled();
  });
  it('el chofer puede activar y detener el GPS explícitamente', async () => {
    deps.api.miJornada.mockResolvedValue(ok({ id: 'jornada-1' }));
    deps.seguimientoNativo.iniciar.mockImplementation(() => { deps.seguimientoNativo.estado.mockResolvedValue({ activo: true, pendientes: 2 }); return Promise.resolve(); });
    deps.seguimientoNativo.detener.mockImplementation(() => { deps.seguimientoNativo.estado.mockResolvedValue({ activo: false, pendientes: 0 }); return Promise.resolve(); });
    render(<SeguimientoAndroid />);
    await userEvent.click(screen.getByRole('button', { name: 'ACTIVAR GPS DE JORNADA' }));
    await waitFor(() => { expect(deps.seguimientoNativo.iniciar).toHaveBeenCalledWith('jornada-1'); });
    await userEvent.click(await screen.findByRole('button', { name: 'DETENER GPS DE JORNADA' }));
    expect(await screen.findByText('GPS de jornada detenido.')).toBeInTheDocument();
  });
  it('avisa si el servicio sigue encendido pero se apagó la ubicación del teléfono', async () => {
    deps.seguimientoNativo.estado.mockResolvedValue({ activo: true, pendientes: 2, ubicacionActiva: false, permisoUbicacion: true });
    render(<SeguimientoAndroid simple />);
    expect(await screen.findByText(/La ubicación del teléfono está apagada/)).toBeInTheDocument();
    expect(screen.queryByText('Seguimiento activo')).toBeNull();
  });

});
