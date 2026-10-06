import { describe, expect, it, vi } from 'vitest';
import { crearPermisosWeb } from './permisos-web';

const permisos = (estados: { geolocation: PermissionState; microphone: PermissionState }) => ({ query: vi.fn(({ name }: PermissionDescriptor) => Promise.resolve({ state: estados[name as 'geolocation' | 'microphone'] } as PermissionStatus)) });
const flujo = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;

describe('permisos del teléfono', () => {
  it('pregunta lo que falta, de a uno, y deja el micrófono apagado', async () => {
    const getCurrentPosition = vi.fn((ok: PositionCallback) => { ok({} as GeolocationPosition); });
    const getUserMedia = vi.fn(() => Promise.resolve(flujo));
    const p = crearPermisosWeb({ permissions: permisos({ geolocation: 'prompt', microphone: 'prompt' }), geolocation: { getCurrentPosition }, mediaDevices: { getUserMedia } });
    expect(await p.pedir()).toEqual({ ubicacion: 'concedido', microfono: 'concedido' });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  it('no vuelve a preguntar lo ya concedido ni lo denegado', async () => {
    const getCurrentPosition = vi.fn();
    const getUserMedia = vi.fn();
    const p = crearPermisosWeb({ permissions: permisos({ geolocation: 'granted', microphone: 'denied' }), geolocation: { getCurrentPosition }, mediaDevices: { getUserMedia } });
    expect(await p.pedir()).toEqual({ ubicacion: 'concedido', microfono: 'denegado' });
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('si la persona lo rechaza queda denegado, y si no se puede preguntar queda pendiente sin fallar', async () => {
    const rechazar = vi.fn((_ok: PositionCallback, fallo: PositionErrorCallback) => { fallo({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError); });
    const sinMicrofono = vi.fn(() => Promise.reject(new DOMException('no', 'NotAllowedError')));
    const p = crearPermisosWeb({ permissions: permisos({ geolocation: 'prompt', microphone: 'prompt' }), geolocation: { getCurrentPosition: rechazar }, mediaDevices: { getUserMedia: sinMicrofono } });
    expect(await p.pedir()).toEqual({ ubicacion: 'denegado', microfono: 'denegado' });
    expect(await crearPermisosWeb({}).pedir()).toEqual({ ubicacion: 'pendiente', microfono: 'pendiente' });
  });
});
