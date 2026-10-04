import type { Result } from '../../domain/result';
import type {
  FilaCliente, LocalDetalle, NuevoUsuario, PinCrudo, PropuestaPin, ResultadoBusqueda, ResultadoImportacion, ResultadoPines, Tokens, TipoFoto, UsuarioAdmin, UsuarioSesion,
} from '../modelos';

export type HealthReport = {
  readonly status: 'ok' | 'degraded';
  readonly database: 'ok' | 'error';
  readonly timestamp: string;
};

/** `HTTP`: el servidor respondió con un error de negocio (`status`, `codigo` y un `mensaje` ya en español). */
export type ApiError = {
  readonly kind: 'NETWORK' | 'TIMEOUT' | 'UNEXPECTED' | 'HTTP';
  readonly status?: number;
  readonly codigo?: string;
  readonly mensaje?: string;
  readonly detalle?: unknown;
  readonly detail?: string;
};

type R<T> = Promise<Result<T, ApiError>>;

/** Lo único que necesita la pantalla «despertando servidor»: preguntar por la salud de la API. */
export interface SaludApi {
  getHealth(signal: AbortSignal): R<HealthReport>;
}

export interface ApiClient extends SaludApi {
  iniciarSesion(username: string, pin: string): R<{ tokens: Tokens; usuario: UsuarioSesion }>;
  yo(): R<UsuarioSesion & { readonly empresaId: string }>;

  buscarClientes(q: string, opciones?: { comuna?: string; limite?: number; signal?: AbortSignal }): R<readonly ResultadoBusqueda[]>;
  crearCliente(fila: FilaCliente): R<{ clienteId: string; localId: string }>;
  importarClientes(filas: readonly FilaCliente[]): R<ResultadoImportacion>;
  obtenerLocal(localId: string): R<LocalDetalle>;
  actualizarLocal(localId: string, cambios: { nota?: string; streetviewRumbo?: number; lat?: number; lng?: number }): R<void>;

  solicitarUrlSubida(localId: string, tipo: TipoFoto): R<{ path: string; url: string }>;
  registrarFoto(localId: string, path: string): R<void>;
  urlFoto(localId: string): R<{ url: string; expiraEnSegundos: number }>;

  importarPines(pines: readonly PinCrudo[]): R<ResultadoPines>;
  listarPropuestas(estado: PropuestaPin['estado']): R<readonly PropuestaPin[]>;
  resolverPropuesta(id: string, accion: 'aceptar' | 'rechazar'): R<void>;

  listarUsuarios(): R<readonly UsuarioAdmin[]>;
  crearUsuario(datos: NuevoUsuario): R<UsuarioAdmin>;
  resetearPin(usuarioId: string, pin: string): R<void>;
  cambiarEstadoUsuario(usuarioId: string, activo: boolean): R<void>;
}
