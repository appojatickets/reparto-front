import type { DiaApi } from '../../domain/horario-semanal';
import type { Result } from '../../domain/result';
import type {
  AsignacionDia, CambiosFactura, FilaPlanillaEnviada, LocalDeLista, ResultadoFilaPlanilla, ResumenComuna, Camion, EstadoBusquedaPines, FilaExportacion, FotosParaRevision, MotivoFoto, FiltroExportacion, ResultadoPinEnlace, Vendedor, ConfigEmpresa, EventoEntrega, Factura, FilaCliente, FiltroFacturas, Jornada, LocalDetalle, NuevaFactura, OperacionRuta, NuevoUsuario, PropuestaPin, ReportesDelLocal, TipoReporteLocal, AccionReporteLocal,
  PinesParaRevisar, ResultadoBusqueda, ResultadoImportacion, PanelAnalitica, PuntoGps, ResultadoPosiciones, ResumenAnalisis, ResumenJornada, Tokens, TipoFoto, ResultadoEvento, UsuarioAdmin, UsuarioSesion, VistaRuta,
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
  /** Cuántos locales hay por comuna, cuántos con pin verificado y cuántos sin pin. */
  resumenComunas(): R<readonly ResumenComuna[]>;
  /** Locales de una comuna, o los que coinciden con un texto (razón social, RUT o dirección); primero los de pin por verificar. */
  listarLocales(filtro: { comuna?: string; texto?: string; limite?: number }): R<{ total: number; locales: readonly LocalDeLista[] }>;
  actualizarLocal(localId: string, cambios: { direccion?: string; comuna?: string; nota?: string; streetviewRumbo?: number; lat?: number; lng?: number }): R<void>;
  /** Corrige la razón social del cliente (error de tipeo). Por ahora el cliente de la ficha es el mismo para todos sus locales. */
  /** Corrige razón social, RUT o giro del cliente (RUT o giro vacíos los borran). La API responde 409 si el RUT ya lo tiene otro cliente. */
  corregirCliente(clienteId: string, cambios: { razonSocial?: string; rut?: string; giro?: string }): R<void>;
  /** Elimina una dirección cargada por error. La API responde 409 si ya tiene entregas hechas (para no perder el historial). */
  eliminarLocal(localId: string): R<void>;

  solicitarUrlSubida(localId: string, tipo: TipoFoto): R<{ path: string; url: string }>;
  registrarFoto(localId: string, path: string): R<void>;
  urlFoto(localId: string): R<{ url: string; expiraEnSegundos: number }>;

  /** Mi foto de perfil: pedir la URL de subida, registrar la foto ya subida o quitarla. Cualquiera con sesión puede. */
  solicitarUrlSubidaPerfil(tipo: TipoFoto): R<{ path: string; url: string }>;
  registrarFotoPerfil(path: string): R<void>;
  quitarFotoPerfil(): R<void>;
  /** La foto de perfil de una persona de la empresa (URL firmada de pocos minutos). 404 si no tiene. */
  urlFotoUsuario(usuarioId: string): R<{ url: string; expiraEnSegundos: number }>;

  listarPropuestas(estado: PropuestaPin['estado']): R<readonly PropuestaPin[]>;
  resolverPropuesta(id: string, accion: 'aceptar' | 'rechazar'): R<void>;
  /** La lista para verificar pines: «por verificar» (lo más seguro primero) o «verificados». Hasta 100; `total` dice cuántos hay. */
  pinesParaRevisar(estado: 'por_verificar' | 'verificados'): R<PinesParaRevisar>;

  listarUsuarios(): R<readonly UsuarioAdmin[]>;
  crearUsuario(datos: NuevoUsuario): R<UsuarioAdmin>;
  resetearPin(usuarioId: string, pin: string): R<void>;
  cambiarEstadoUsuario(usuarioId: string, activo: boolean): R<void>;
  /** Solo admin: da o quita el permiso de editor (corregir nombres, quitar fotos, eliminar direcciones) a un chofer o ayudante. */
  cambiarEditorUsuario(usuarioId: string, editor: boolean): R<void>;

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
  /** Admin o despachador: confirma (o quita la confirmación de) el pin de un local. Un pin verificado ya no se mueve con las entregas. */
  verificarPin(localId: string, verificado: boolean): R<void>;
  /** Cualquiera reporta la foto de un local mal tomada; el admin la revisa. */
  reportarFoto(localId: string, reporte: { readonly motivo: MotivoFoto; readonly detalle?: string }): R<void>;
  /** Solo admin: las fotos reportadas y las subidas, separadas en por verificar y verificadas. */
  fotosParaRevision(): R<FotosParaRevision>;
  /** Solo admin: da por buena la foto que se vio (`verificada: true`, sale de «por verificar») o la devuelve a «por verificar». */
  verificarFoto(localId: string, fotoPath: string, verificada: boolean): R<void>;
  /** Solo admin: eliminar la foto reportada o dejarla. */
  resolverReporteFoto(id: string, accion: 'eliminar' | 'descartar'): R<void>;
  /** Reportar el nombre o la ubicación (pin) de un local; el admin lo revisa en REPORTES. */
  reportarLocal(localId: string, reporte: { readonly tipo: TipoReporteLocal; readonly detalle?: string; readonly sugerido?: string }): R<void>;
  /** Todo lo reportado y sin resolver: fotos, nombres y ubicaciones. */
  verReportes(): R<ReportesDelLocal>;
  resolverReporteLocal(id: string, accion: AccionReporteLocal): R<void>;
  listarVendedores(opciones?: { incluirInactivos?: boolean }): R<readonly Vendedor[]>;
  crearVendedor(datos: { codigo: string; nombre: string; celular?: string }): R<Vendedor>;
  actualizarVendedor(id: string, cambios: { nombre?: string; celular?: string | null; activo?: boolean }): R<Vendedor>;

  /** Qué lleva cada camión un día (hoy si no se indica). */
  obtenerPlanilla(fecha?: string): R<readonly AsignacionDia[]>;
  /** Aplica la planilla de la mañana: crea camiones y vendedores que falten, enlaza chofer y ayudante y, si es de hoy, les deja su camión elegido. */
  aplicarPlanilla(fecha: string, filas: readonly FilaPlanillaEnviada[]): R<readonly ResultadoFilaPlanilla[]>;

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
  /** Informa dónde está el camión mientras la app está abierta; el servidor anota solo la llegada si se queda junto al pin de una entrega. */
  enviarPosiciones(puntos: readonly PuntoGps[]): R<ResultadoPosiciones>;
  /** Solo admin: qué datos se guardan, qué aprendió el sistema y cuánto se parece la ruta sugerida a la manejada. */
  analitica(): R<PanelAnalitica>;
  /** Solo admin: correr el análisis ahora (normalmente corre solo). */
  ejecutarAnalisis(): R<ResumenAnalisis>;

  obtenerHorario(localId: string): R<readonly DiaApi[]>;
  guardarHorario(localId: string, dias: readonly DiaApi[]): R<readonly DiaApi[]>;

  verRuta(camionId: string, fecha: string): R<VistaRuta>;
  /** `orden: 'carga'` arma la ruta en el orden en que se cargaron las facturas (sin calcularla). */
  planificarRuta(camionId: string, fecha: string, salidaMin?: number, orden?: 'calcular' | 'carga'): R<VistaRuta>;
  operarRuta(camionId: string, fecha: string, version: number, operacion: OperacionRuta): R<VistaRuta>;
}
