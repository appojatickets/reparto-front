import { err, ok, type Result } from '../../domain/result';
import { mensajeDeError } from '../mensajes';
import type { UsuarioSesion } from '../modelos';
import type { ApiClient } from '../ports/api-client';
import type { SesionStore } from '../ports/sesion-store';

type Deps = { readonly api: ApiClient; readonly store: SesionStore };

export const crearIniciarSesion = ({ api, store }: Deps) =>
  async (username: string, pin: string): Promise<Result<UsuarioSesion, string>> => {
    const usuario = username.trim().toLowerCase();
    if (usuario === '') return err('Escribe tu usuario.');
    if (pin.trim() === '') return err('Escribe tu clave.');
    const r = await api.iniciarSesion(usuario, pin.trim());
    if (!r.ok) return err(mensajeDeError(r.error, 'No se pudo entrar. Intenta de nuevo.'));
    store.guardar(r.value.tokens);
    return ok(r.value.usuario);
  };

export type EstadoSesion =
  | { readonly tipo: 'sesion'; readonly usuario: UsuarioSesion }
  | { readonly tipo: 'sin_sesion' }
  | { readonly tipo: 'sin_conexion' };

/**
 * Al abrir la app: ¿sigue válida la sesión guardada? Sin señal NO se cierra la sesión (el chofer trabaja sin conexión);
 * solo una respuesta 401/403 del servidor la descarta.
 */
export const crearRestaurarSesion = ({ api, store }: Deps) =>
  async (): Promise<EstadoSesion> => {
    if (!store.cargar()) return { tipo: 'sin_sesion' };
    const r = await api.yo();
    if (r.ok) return { tipo: 'sesion', usuario: { id: r.value.id, username: r.value.username, nombre: r.value.nombre, rol: r.value.rol, editor: r.value.editor } };
    if (r.error.kind === 'HTTP' && (r.error.status === 401 || r.error.status === 403)) {
      store.borrar();
      return { tipo: 'sin_sesion' };
    }
    return { tipo: 'sin_conexion' };
  };

export const crearCerrarSesion = ({ store }: { store: SesionStore }) => (): void => {
  store.borrar();
};
