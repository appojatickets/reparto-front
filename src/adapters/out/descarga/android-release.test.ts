import { describe, expect, it, vi } from 'vitest';
import { crearConsultaAndroid } from './android-release';

const publicacion = { draft: false, prerelease: false, tag_name: 'android-v4', assets: [{ name: 'reparto.apk', size: 5_000_000, state: 'uploaded', browser_download_url: 'https://github.com/appojatickets/reparto-front/releases/download/android-v4/reparto.apk' }] };
const signal = new AbortController().signal;
const respuesta = (body: unknown, status = 200) => vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(body), { status })));

describe('descarga Android de distribución', () => {
  it('ofrece el APK publicado sin mandar credenciales', async () => {
    const fetch = respuesta(publicacion);
    expect(await crearConsultaAndroid(fetch)(signal)).toEqual({ tipo: 'lista', apk: { version: 'android-v4', url: publicacion.assets[0]?.browser_download_url, tamanoBytes: 5_000_000 } });
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ credentials: 'omit', cache: 'no-store', signal }));
  });
  it('no ofrece enlaces mientras falta la firma o una publicación completa', async () => {
    for (const data of [{ ...publicacion, assets: [] }, { ...publicacion, prerelease: true }, { ...publicacion, draft: true }, { ...publicacion, tag_name: 'otro-producto' }]) {
      expect(await crearConsultaAndroid(respuesta(data))(signal)).toEqual({ tipo: 'preparando' });
    }
    expect(await crearConsultaAndroid(respuesta({}, 404))(signal)).toEqual({ tipo: 'preparando' });
  });
  it('rechaza enlaces a APK externos y diferencias entre versión y archivo', async () => {
    for (const url of ['https://ejemplo.test/reparto.apk', 'https://github.com/appojatickets/reparto-front/releases/download/android-v3/reparto.apk']) {
      const data = { ...publicacion, assets: [{ ...publicacion.assets[0], browser_download_url: url }] };
      expect(await crearConsultaAndroid(respuesta(data))(signal)).toEqual({ tipo: 'preparando' });
    }
  });
  it('maneja falta de conexión y límites del servicio sin mostrar una descarga inválida', async () => {
    expect(await crearConsultaAndroid(respuesta({}, 403))(signal)).toEqual({ tipo: 'sin_conexion' });
    expect(await crearConsultaAndroid(vi.fn(() => Promise.reject(new Error('sin red'))))(signal)).toEqual({ tipo: 'sin_conexion' });
  });
});
