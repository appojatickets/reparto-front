import { err, ok, type Result } from '../../domain/result';
import { mensajeDeError } from '../mensajes';
import type { ApiClient } from '../ports/api-client';
import type { Imagenes, SubidaDeArchivos } from '../ports/imagenes';

/** Foto de fachada: comprimir → pedir URL firmada → subir directo al almacenamiento → registrar en el local. */
export const crearSubirFotoLocal = ({ api, imagenes, subida }: { api: ApiClient; imagenes: Imagenes; subida: SubidaDeArchivos }) =>
  async (localId: string, archivo: Blob): Promise<Result<string, string>> => {
    const foto = await imagenes.comprimir(archivo);
    if (!foto.ok) return err('No se pudo preparar la foto. Prueba con otra.');
    const url = await api.solicitarUrlSubida(localId, foto.value.tipo);
    if (!url.ok) return err(mensajeDeError(url.error));
    const sube = await subida.subir(url.value.url, foto.value);
    if (!sube.ok) return err('No se pudo subir la foto. Revisa tu señal e intenta de nuevo.');
    const reg = await api.registrarFoto(localId, url.value.path);
    return reg.ok ? ok(url.value.path) : err(mensajeDeError(reg.error));
  };
