import type { DiaApi } from '../../domain/horario-semanal';
import type { Result } from '../../domain/result';
import type {
  CambiosFactura, Camion, EstadoBusquedaPines, FilaExportacion, FiltroExportacion, ResultadoPinEnlace, Vendedor, ConfigEmpresa, EventoEntrega, Factura, FilaCliente, FiltroFacturas, Jornada, LocalDetalle, NuevaFactura, OperacionRuta, NuevoUsuario, PinCrudo, PropuestaPin, ResultadoBusqueda, ResultadoImportacion, ResultadoPines, ResumenJornada, Tokens, TipoFoto, ResultadoEvento, UsuarioAdmin, UsuarioSesion, VistaRuta,
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
  /** Si el cliente ya existía con esa dirección (incompleto), se completa y se devuelve el existente (`existente: true`). */
  crearCliente(fila: FilaCliente): R<{ clienteId: string; localId: string; existente: boolean }>;
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

  listarCamiones(opciones?: { incluirInactivos?: boolean }): R<readonly Camion[]>;
  crearCamion(datos: { patente: string; alias?: string }): R<Camion>;
  actualizarCamion(id: string, cambios: { alias?: string | null; activo?: boolean }): R<Camion>;

  /** El enlace (o las coordenadas) que mandó el vendedor: la API lo lee, incluso si es un enlace corto, y fija el pin del local. */
  fijarPinDesdeEnlace(localId: string, enlace: string): R<ResultadoPinEnlace>;
  /** Pide buscar en el mapa el pin de los locales sin pin (corre en el servidor, de a uno por segundo). */
  buscarPinesPendientes(): R<EstadoBusquedaPines & { readonly encolados: number }>;
  estadoBusquedaPines(): R<EstadoBusquedaPines>;
  /** Los locales y sus clientes para exportar (solo admin), con filtros; la pantalla elige las columnas. */
  exportarLocales(filtro?: FiltroExportacion): R<{ readonly total: number; readonly filas: readonly FilaExportacion[] }>;
  /** Quita la foto de la fachada del local (admin o despachador). */
  quitarFoto(localId: string): R<void>;
  listarVendedores(opciones?: { incluirInactivos?: boolean }): R<readonly Vendedor[]>;
  crearVendedor(datos: { codigo: string; nombre: string; celular?: string }): R<Vendedor>;
  actualizarVendedor(id: string, cambios: { nombre?: string; celular?: string | null; activo?: boolean }): R<Vendedor>;

  listarFacturas(filtro?: FiltroFacturas): R<readonly Factura[]>;
  registrarFactura(datos: NuevaFactura): R<Factura>;
  actualizarFactura(id: string, cambios: CambiosFactura): R<Factura>;

  miJornada(): R<Jornada | null>;
  iniciarJornada(camionId: string): R<Jornada>;
  terminarJornada(): R<void>;
  /** Termina la ruta de hoy: cierra la jornada y devuelve el resumen del día (null si no había jornada). */
  terminarRuta(): R<ResumenJornada | null>;

  obtenerConfig(): R<ConfigEmpresa>;
  guardarConfig(config: ConfigEmpresa): R<ConfigEmpresa>;

  registrarEvento(facturaId: string, evento: EventoEntrega): R<ResultadoEvento>;

  obtenerHorario(localId: string): R<readonly DiaApi[]>;
  guardarHorario(localId: string, dias: readonly DiaApi[]): R<readonly DiaApi[]>;

  verRuta(camionId: string, fecha: string): R<VistaRuta>;
  planificarRuta(camionId: string, fecha: string, salidaMin?: number): R<VistaRuta>;
  operarRuta(camionId: string, fecha: string, version: number, operacion: OperacionRuta): R<VistaRuta>;
}
