import { describe, expect, it, vi } from 'vitest';
import { crearNominatim } from './nominatim';

const json = (cuerpo: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(cuerpo), { status }));
const de = (f: () => Promise<Response>) => crearNominatim(vi.fn(f));

describe('Nominatim', () => {
  it('lee la comuna del municipio y pide solo las coordenadas', async () => {
    const buscar = vi.fn(() => json({ address: { village: 'Hospital', municipality: 'Paine', county: 'Provincia de Maipo', state: 'Región Metropolitana de Santiago' } }));
    const r = await crearNominatim(buscar).comunaDe(-33.797267, -70.776552);
    expect(r).toEqual({ ok: true, value: 'Paine' });
    const url = (buscar.mock.calls[0] as unknown as [string])[0];
    expect(url).toContain('lat=-33.797267');
    expect(url).toContain('lon=-70.776552');
  });

  it('sin una comuna de la RM en la respuesta no hay resultado', async () => {
    const r = await de(() => json({ address: { municipality: 'Quilpué', state: 'Valparaíso' } })).comunaDe(-33.4, -70.6);
    expect(r).toEqual({ ok: false, error: 'SIN_RESULTADO' });
    expect(await de(() => json({ error: 'Unable to geocode' })).comunaDe(-33.4, -70.6)).toEqual({ ok: false, error: 'SIN_RESULTADO' });
  });

  it('distingue el límite de consultas de una caída de la red', async () => {
    expect(await de(() => json({}, 429)).comunaDe(-33.4, -70.6)).toEqual({ ok: false, error: 'LIMITE' });
    expect(await de(() => json({}, 500)).comunaDe(-33.4, -70.6)).toEqual({ ok: false, error: 'RED' });
    expect(await de(() => Promise.reject(new Error('sin red'))).comunaDe(-33.4, -70.6)).toEqual({ ok: false, error: 'RED' });
    expect(await de(() => Promise.resolve(new Response('no es json', { status: 200 }))).comunaDe(-33.4, -70.6)).toEqual({ ok: false, error: 'RED' });
  });
});
