import { StrictMode } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermisosAlAbrir } from './PermisosAlAbrir';
const deps = vi.hoisted(() => ({ permisos: { estado: vi.fn(), pedir: vi.fn() }, seguimientoNativo: undefined }));
vi.mock('../contexto', () => ({ useCasos: () => deps }));
beforeEach(() => { localStorage.clear(); vi.resetAllMocks(); deps.permisos.estado.mockResolvedValue({ ubicacion: 'concedido', microfono: 'concedido' }); deps.permisos.pedir.mockResolvedValue({ ubicacion: 'concedido', microfono: 'concedido' }); });
describe('permisos al abrir y al volver de ajustes', () => {
  it('revisa y solicita lo pendiente en cada apertura aunque ya se haya preguntado', async () => {
    render(<PermisosAlAbrir usuarioId="u1" />);
    await waitFor(() => { expect(deps.permisos.pedir).toHaveBeenCalledTimes(1); });
    cleanup();
    render(<PermisosAlAbrir usuarioId="u1" />);
    await waitFor(() => { expect(deps.permisos.pedir).toHaveBeenCalledTimes(2); });
    deps.permisos.estado.mockResolvedValue({ ubicacion: 'denegado', microfono: 'concedido' });
    await act(() => { window.dispatchEvent(new Event('focus')); return Promise.resolve(); });
    expect(await screen.findByText(/Ubicación sin activar/)).toBeInTheDocument();
    deps.permisos.estado.mockResolvedValue({ ubicacion: 'concedido', microfono: 'concedido' });
    await act(() => { window.dispatchEvent(new Event('focus')); return Promise.resolve(); });
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('recordar que se preguntó no convierte un permiso rechazado en concedido', async () => {
    deps.permisos.pedir.mockResolvedValue({ ubicacion: 'concedido', microfono: 'denegado' });
    render(<PermisosAlAbrir usuarioId="u2" />);
    expect(await screen.findByText(/Micrófono sin activar/)).toBeInTheDocument();
    expect(localStorage.getItem('reparto:permisos-preguntados:u2')).toBe('si');
  });
  it('muestra cómo revisar los permisos aunque falle la solicitud inicial', async () => {
    deps.permisos.pedir.mockRejectedValue(new Error('sistema ocupado'));
    deps.permisos.estado.mockRejectedValue(new Error('no disponible'));
    render(<PermisosAlAbrir />);
    expect(await screen.findByText(/Ubicación sin activar/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PERMITIR MICRÓFONO Y UBICACIÓN' })).toBeEnabled();
  });

  it('el reinicio de efectos de React no abre dos solicitudes simultáneas', async () => {
    render(<StrictMode><PermisosAlAbrir usuarioId="u3" /></StrictMode>);
    await waitFor(() => { expect(deps.permisos.pedir).toHaveBeenCalledTimes(1); });
  });

});
