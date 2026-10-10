import { describe, expect, it, vi } from 'vitest';
import { err, ok } from '../../domain/result';
import type { ApiClient } from '../ports/api-client';
import type { Imagenes, SubidaDeArchivos } from '../ports/imagenes';
import { crearQuitarFotoPerfil, crearSubirFotoPerfil } from './subir-foto-perfil';
import { fakeApi, http, USUARIO } from './fakes.test-util';

const archivo = new Blob(['x'], { type: 'image/jpeg' });
const avatar = { blob: new Blob(['a'], { type: 'image/webp' }), tipo: 'webp' as const };
const imagenes = (recorte: Awaited<ReturnType<Imagenes['recortarAvatar']>> = ok(avatar)): Imagenes => ({ comprimir: vi.fn(), recortarAvatar: vi.fn(() => Promise.resolve(recorte)) });
const subida = (r: Awaited<ReturnType<SubidaDeArchivos['subir']>> = ok(undefined)): SubidaDeArchivos => ({ subir: vi.fn(() => Promise.resolve(r)) });
const conFoto = { ...USUARIO, empresaId: 'e1', fotoEn: '2026-10-10T12:00:00.000Z' };

describe('subir mi foto de perfil', () => {
  it('recorta, pide la URL, sube y registra; devuelve cuándo quedó puesta', async () => {
    const solicitar = vi.fn<ApiClient['solicitarUrlSubidaPerfil']>(() => Promise.resolve(ok({ path: 'e1/perfil/u1/a.webp', url: 'https://alm.test/subir' })));
    const registrar = vi.fn<ApiClient['registrarFotoPerfil']>(() => Promise.resolve(ok(undefined)));
    const api = fakeApi({ solicitarUrlSubidaPerfil: solicitar, registrarFotoPerfil: registrar, yo: () => Promise.resolve(ok(conFoto)) });
    const subir = vi.fn<SubidaDeArchivos['subir']>(() => Promise.resolve(ok(undefined)));
    const r = await crearSubirFotoPerfil({ api, imagenes: imagenes(), subida: { subir } })(archivo);
    expect(r).toEqual(ok(conFoto.fotoEn));
    expect(solicitar).toHaveBeenCalledWith('webp');
    expect(subir).toHaveBeenCalledWith('https://alm.test/subir', avatar);
    expect(registrar).toHaveBeenCalledWith('e1/perfil/u1/a.webp');
  });

  it('una imagen que no se puede leer da un mensaje y no toca el servidor', async () => {
    const api = fakeApi();
    const r = await crearSubirFotoPerfil({ api, imagenes: imagenes(err({ detalle: 'mala' })), subida: subida() })(archivo);
    expect(r).toEqual(err('No se pudo preparar la foto. Prueba con otra.'));
  });

  it('si falla pedir la URL, subir o registrar, avisa con un mensaje claro', async () => {
    const pide = vi.fn(() => Promise.resolve(ok({ path: 'p', url: 'u' })));
    const falloUrl = fakeApi({ solicitarUrlSubidaPerfil: () => Promise.resolve(http(503)) });
    expect((await crearSubirFotoPerfil({ api: falloUrl, imagenes: imagenes(), subida: subida() })(archivo)).ok).toBe(false);
    const falloSubir = await crearSubirFotoPerfil({ api: fakeApi({ solicitarUrlSubidaPerfil: pide }), imagenes: imagenes(), subida: subida(err({ detalle: 'red' })) })(archivo);
    expect(falloSubir).toEqual(err('No se pudo subir la foto. Revisa tu señal e intenta de nuevo.'));
    const falloRegistro = await crearSubirFotoPerfil({ api: fakeApi({ solicitarUrlSubidaPerfil: pide, registrarFotoPerfil: () => Promise.resolve(http(400)) }), imagenes: imagenes(), subida: subida() })(archivo);
    expect(falloRegistro.ok).toBe(false);
  });

  it('si no se puede leer la fecha de vuelta, usa la hora de ahora para que la foto se refresque igual', async () => {
    const api = fakeApi({ solicitarUrlSubidaPerfil: () => Promise.resolve(ok({ path: 'p', url: 'u' })), registrarFotoPerfil: () => Promise.resolve(ok(undefined)), yo: () => Promise.resolve(http(503)) });
    const r = await crearSubirFotoPerfil({ api, imagenes: imagenes(), subida: subida(), ahora: () => new Date('2026-10-10T15:00:00.000Z') })(archivo);
    expect(r).toEqual(ok('2026-10-10T15:00:00.000Z'));
  });
});

describe('quitar mi foto de perfil', () => {
  it('la quita en el servidor', async () => {
    const quitar = vi.fn(() => Promise.resolve(ok(undefined)));
    expect((await crearQuitarFotoPerfil({ api: fakeApi({ quitarFotoPerfil: quitar }) })()).ok).toBe(true);
    expect(quitar).toHaveBeenCalledOnce();
  });

  it('si falla, devuelve el mensaje', async () => {
    const r = await crearQuitarFotoPerfil({ api: fakeApi({ quitarFotoPerfil: () => Promise.resolve(http(503)) }) })();
    expect(r.ok).toBe(false);
  });
});
