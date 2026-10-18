import { err, ok, type Result } from '../../domain/result';
import { mensajeDeError } from '../mensajes';
import type { ApiClient } from '../ports/api-client';
import type { Imagenes, SubidaDeArchivos } from '../ports/imagenes';

/**
 * Mi foto de perfil: recortar un cuadrado → pedir URL firmada → subir directo al almacenamiento → registrar.
 * Devuelve el momento en que quedó puesta (sirve para refrescar la foto en pantalla).
 */
export const crearSubirFotoPerfil = ({ api, imagenes, subida, ahora = () => new Date() }: { api: ApiClient; imagenes: Imagenes; subida: SubidaDeArchivos; ahora?: () => Date }) =>
  async (archivo: Blob): Promise<Result<string, string>> => {
    const foto = await imagenes.recortarAvatar(archivo);
    if (!foto.ok) return err('No se pudo preparar la foto. Prueba con otra.');
    const url = await api.solicitarUrlSubidaPerfil(foto.value.tipo);
    if (!url.ok) return err(mensajeDeError(url.error));
    const sube = await subida.subir(url.value.url, foto.value);
    if (!sube.ok) return err('No se pudo subir la foto. Revisa tu señal e intenta de nuevo.');
    const reg = await api.registrarFotoPerfil(url.value.path);
    if (!reg.ok) return err(mensajeDeError(reg.error));
    // La foto ya quedó: si no se puede leer la fecha exacta, la hora de ahora basta para refrescarla.
    const yo = await api.yo();
    return ok(yo.ok && yo.value.fotoEn !== undefined ? yo.value.fotoEn : ahora().toISOString());
  };

export const crearQuitarFotoPerfil = ({ api }: { api: ApiClient }) =>
  async (): Promise<Result<void, string>> => {
    const r = await api.quitarFotoPerfil();
    return r.ok ? ok(undefined) : err(mensajeDeError(r.error));
  };
