import { describe, expect, it, vi } from 'vitest';
import { crearPantallaEncendida } from './wake-lock';

describe('pantalla encendida', () => {
  it('pide el bloqueo una vez y lo suelta', async () => {
    const release = vi.fn(() => Promise.resolve());
    const request = vi.fn(() => Promise.resolve({ release, released: false }));
    const p = crearPantallaEncendida({ wakeLock: { request } });
    expect(p.disponible).toBe(true);
    expect(await p.mantener()).toBe(true);
    expect(await p.mantener()).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    await p.soltar();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('sin soporte o si el navegador lo niega, dice que no', async () => {
    expect(await crearPantallaEncendida({}).mantener()).toBe(false);
    expect(await crearPantallaEncendida({ wakeLock: { request: () => Promise.reject(new Error('no')) } }).mantener()).toBe(false);
  });
});
