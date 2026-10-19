import { describe, expect, it, vi } from 'vitest';
import { crearPermisosAndroid } from './permisos-android';
const microfono = () => ({ estado: vi.fn(() => Promise.resolve({ ubicacion: 'pendiente' as const, microfono: 'concedido' as const })), pedir: vi.fn(() => Promise.resolve({ ubicacion: 'pendiente' as const, microfono: 'concedido' as const })) });
describe('permisos nativos de ubicación y micrófono web', () => {
  it('usa Android para ubicación y conserva la respuesta independiente del micrófono', async () => {
    const audio = microfono();
    const geo = { checkPermissions: vi.fn(() => Promise.resolve({ location: 'prompt' as const, coarseLocation: 'prompt' as const })), requestPermissions: vi.fn(() => Promise.resolve({ location: 'granted' as const, coarseLocation: 'granted' as const })) };
    const permisos = crearPermisosAndroid(audio, geo);
    expect(await permisos.pedir()).toEqual({ ubicacion: 'concedido', microfono: 'concedido' });
    expect(geo.requestPermissions).toHaveBeenCalledWith({ permissions: ['location'] });
    expect(audio.pedir).toHaveBeenCalledTimes(1);
  });
  it('consultar una revocación no vuelve a abrir el permiso', async () => {
    const geo = { checkPermissions: vi.fn(() => Promise.resolve({ location: 'denied' as const, coarseLocation: 'denied' as const })), requestPermissions: vi.fn() };
    const permisos = crearPermisosAndroid(microfono(), geo);
    expect(await permisos.estado()).toEqual({ ubicacion: 'denegado', microfono: 'concedido' });
    expect(geo.requestPermissions).not.toHaveBeenCalled();
  });
});
