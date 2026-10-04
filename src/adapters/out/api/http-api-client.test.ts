import { describe, expect, it } from 'vitest';
import { createHttpApiClient } from './http-api-client';

const body = { status: 'ok', database: 'ok', timestamp: '2026-10-05T12:00:00.000Z' };
const json = (status: number, data: unknown): typeof fetch =>
  () => Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } }));

const signal = new AbortController().signal;

describe('createHttpApiClient', () => {
  it('200 devuelve el reporte', async () => {
    const api = createHttpApiClient({ baseUrl: 'http://api.test', fetch: json(200, body) });
    expect(await api.getHealth(signal)).toEqual({ ok: true, value: body });
  });

  it('503 también devuelve el reporte (degraded)', async () => {
    const degraded = { ...body, status: 'degraded', database: 'error' };
    const api = createHttpApiClient({ baseUrl: 'http://api.test', fetch: json(503, degraded) });
    expect(await api.getHealth(signal)).toEqual({ ok: true, value: degraded });
  });

  it('falla de red devuelve NETWORK', async () => {
    const api = createHttpApiClient({
      baseUrl: 'http://api.test',
      fetch: () => Promise.reject(new TypeError('Failed to fetch')),
    });
    expect(await api.getHealth(signal)).toEqual({ ok: false, error: { kind: 'NETWORK' } });
  });

  it('cuerpo vacío devuelve UNEXPECTED', async () => {
    const api = createHttpApiClient({
      baseUrl: 'http://api.test',
      fetch: () => Promise.resolve(new Response(null, { status: 502 })),
    });
    expect(await api.getHealth(signal)).toEqual({ ok: false, error: { kind: 'UNEXPECTED' } });
  });
});
