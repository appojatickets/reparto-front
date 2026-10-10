import type { PinRespaldo } from '../domain/respaldo-pin';
import type { Motivo } from '../domain/motivos';
import type { Rol } from '../domain/rol';
import type { FilaClienteCruda } from '../domain/tabla';

export type UsuarioSesion = { readonly id: string; readonly username: string; readonly nombre: string; readonly rol: Rol; readonly editor: boolean };
export type Tokens = { readonly accessToken: string; readonly refreshToken: string };

export type EstadoPin = 'pendiente' | 'sugerido' | 'validado';

export type ResultadoBusqueda = {
  readonly localId: string;
  readonly clienteId: string;
  readonly razonSocial: string;
  readonly direccion: string;
  readonly comuna: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly pinEstado: EstadoPin;
  /** Alguien verificó el pin / el admin dio por buena la foto: se muestran como insignias ✓. */
  readonly pinVerificado?: boolean;
  readonly fotoPath?: string;
  readonly fotoVerificada?: boolean;
  readonly streetviewRumbo?: number;
  readonly nota?: string;
};

/** `pinVerificado`: una persona confirmó el pin y ya no se mueve solo; si no, está «por verificar» y cada entrega con buen GPS lo ajusta. */
/** `pinRespaldo`: qué tan firme es el pin según las entregas (solo si el local tiene pin y el servidor pudo calcularlo). */
export type LocalDetalle = Omit<ResultadoBusqueda, 'localId'> & { readonly id: string; readonly rut?: string; readonly pinVerificado: boolean; readonly pinVerificacion?: QuienVerifico; readonly fotoVerificada?: boolean; readonly pinRespaldo?: PinRespaldo };

/** Una fila de la sección «Locales»: los datos del cliente y del local, el pin y lo entregado. */
export type LocalDeLista = {
  readonly localId: string;
  readonly clienteId: string;
  readonly razonSocial: string;
  readonly rut?: string;
  readonly giro?: string;
  readonly direccion: string;
  readonly comuna: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly pinFuente?: string;
  readonly pinVerificado: boolean;
  readonly pinVerificacion?: 'persona' | 'entregas';
  readonly nota?: string;
  readonly streetviewRumbo?: number;
  readonly tieneFoto: boolean;
  /** Facturas ya entregadas a este local. */
  readonly entregas: number;
};
export type ResumenComuna = { readonly comuna: string; readonly total: number; readonly verificados: number; readonly sinPin: number };

export type ErrorFila = { readonly fila: number; readonly errores: readonly { readonly codigo: string; readonly mensaje: string }[] };
export type ResumenImportacion = { readonly clientesCreados: number; readonly clientesActualizados: number; readonly localesCreados: number; readonly localesActualizados: number };
export type ResultadoImportacion = { readonly totalFilas: number; readonly validas: number; readonly errores: readonly ErrorFila[]; readonly resumen: ResumenImportacion };

export type PropuestaPin = {
  readonly id: string;
  readonly direccion: string;
  readonly lat: number;
  readonly lng: number;
  readonly distanciaActualM?: number;
  readonly estado: 'pendiente' | 'aceptada' | 'rechazada' | 'sin_local';
  readonly razonSocial?: string;
  readonly comuna?: string;
  readonly pinActual?: { readonly lat: number; readonly lng: number };
};
/** Quién dejó verificado un pin: una persona, o el sistema solo porque las entregas lo confirmaron (ADR 0032 del back). */
export type QuienVerifico = 'persona' | 'entregas';
/** Un pin en la pantalla de revisión: el local, su pin, qué tan firme es y, si está verificado, quién lo verificó. */
export type PinParaRevisar = {
  readonly id: string;
  readonly razonSocial: string;
  readonly direccion: string;
  readonly comuna: string;
  readonly lat: number;
  readonly lng: number;
  readonly pinVerificacion?: QuienVerifico;
  readonly verificadoEn?: string;
  readonly respaldo: PinRespaldo;
};
export type PinesParaRevisar = { readonly total: number; readonly pines: readonly PinParaRevisar[] };
/** Lo que se puede reportar de un local además de su foto. */
export type TipoReporteLocal = 'nombre' | 'ubicacion';
/** Un reporte abierto, de lo que sea (foto, nombre o ubicación): el admin los ve juntos. */
export type ReporteDelLocal = {
  readonly id: string;
  readonly tipo: 'foto' | TipoReporteLocal;
  readonly localId: string;
  readonly razonSocial: string;
  readonly direccion: string;
  readonly comuna: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly motivo?: string;
  readonly detalle?: string;
  readonly sugerido?: string;
  readonly reportadoPor?: string;
  readonly reportadoEn: string;
  /** Foto: ya no es la reportada. Nombre o ubicación: ya cambió desde el reporte. */
  readonly yaCambio: boolean;
  readonly subidaPor?: string;
  readonly subidaEn?: string;
};
export type ReportesDelLocal = { readonly total: number; readonly reportes: readonly ReporteDelLocal[] };
export type AccionReporteLocal = 'verificar_pin' | 'corregido' | 'descartar';

export type UsuarioAdmin = UsuarioSesion & { readonly activo: boolean };
export type NuevoUsuario = { readonly nombre: string; readonly apellidoPaterno: string; readonly apellidoMaterno?: string; readonly rol: Rol; readonly pin: string };

export type TipoFoto = 'webp' | 'jpeg';
export type FilaCliente = FilaClienteCruda;

export type Camion = { readonly id: string; readonly patente: string; readonly alias?: string; readonly activo: boolean };
export type Vendedor = { readonly id: string; readonly codigo: string; readonly nombre: string; readonly celular?: string; readonly activo: boolean };
export type ResultadoPinEnlace = { readonly resultado: 'fijado' | 'propuesto'; readonly lat: number; readonly lng: number };
export type { FilaExportacion } from '../domain/exportacion';
export type FiltroExportacion = {
  readonly comunas?: readonly string[];
  readonly pin?: 'con' | 'sin' | 'aproximado';
  readonly foto?: 'con' | 'sin';
  readonly texto?: string;
};
export type MotivoFoto = 'no_es_la_fachada' | 'se_ven_personas' | 'borrosa' | 'otra';
export type ReporteFoto = {
  readonly id: string;
  readonly localId: string;
  readonly razonSocial: string;
  readonly direccion: string;
  readonly comuna: string;
  readonly motivo: MotivoFoto;
  readonly detalle?: string;
  readonly reportadoPor?: string;
  readonly reportadoEn: string;
  /** La foto reportada ya no es la del local (la reemplazaron o la quitaron): el reporte sigue abierto hasta cerrarlo. */
  readonly fotoReemplazada: boolean;
  readonly subidaPor?: string;
  readonly subidaEn?: string;
};
/** La foto vigente de un local; `fotoPath` la identifica al verificarla (si la cambian mientras tanto, no se verifica otra). */
export type FotoSubida = { readonly localId: string; readonly fotoPath: string; readonly razonSocial: string; readonly direccion: string; readonly comuna: string; readonly subidaPor?: string; readonly subidaEn?: string };
export type FotoVerificada = FotoSubida & { readonly verificadaPor?: string; readonly verificadaEn: string };
export type FotosParaRevision = { readonly reportadas: readonly ReporteFoto[]; readonly porVerificar: readonly FotoSubida[]; readonly verificadas: readonly FotoVerificada[] };
export type EstadoBusquedaPines = { readonly sinPin: number; readonly enCola: number; readonly enMarcha: boolean };
export type CamionResumen = { readonly id: string; readonly patente: string; readonly alias?: string };

export type EstadoEntrega = 'pendiente' | 'entregada' | 'no_entregada' | 'anulada';

export type Factura = {
  readonly id: string;
  readonly folio?: string;
  readonly fecha: string;
  readonly estado: EstadoEntrega;
  readonly total?: number;
  readonly antesDeMin?: number;
  readonly urgente: boolean;
  readonly nota?: string;
  readonly camion?: CamionResumen;
  readonly local: { readonly id: string; readonly razonSocial: string; readonly direccion: string; readonly comuna: string; readonly tienePin: boolean };
};
export type NuevaFactura = {
  readonly folio?: string;
  readonly localId: string;
  readonly camionId?: string;
  readonly fecha?: string;
  readonly antesDeMin?: number;
  readonly urgente?: boolean;
  readonly nota?: string;
};
/** `null` quita el valor. */
export type CambiosFactura = {
  readonly camionId?: string | null;
  readonly estado?: 'pendiente' | 'anulada';
  readonly antesDeMin?: number | null;
  readonly urgente?: boolean;
  readonly nota?: string | null;
};
export type FiltroFacturas = { readonly fecha?: string; readonly incluirAnuladas?: boolean; readonly incluirHechas?: boolean };

export type EventoEntrega = {
  readonly tipo: 'llegada' | 'entregado' | 'cerrado' | 'espera' | 'no_entregado' | 'vuelve_mas_tarde';
  readonly lat?: number;
  readonly lng?: number;
  readonly precisionM?: number;
  readonly motivo?: 'cerrado' | 'no_recibe' | 'direccion' | 'otro';
  readonly minutos?: number;
};
export type ResultadoEvento = { readonly estado: EstadoEntrega; readonly pinFijado: boolean };

export type ConfigEmpresa = {
  readonly deposito?: { readonly lat: number; readonly lng: number; readonly nombre?: string };
  readonly salidaPorDefectoMin: number;
  readonly horaLimiteRegresoMin: number;
  /** Por dónde parte la ruta (ADR 0038 del back); sin indicar, lo decide el sistema. */
  readonly ordenInicio?: OrdenInicio;
};
export type OrdenInicio = 'automatico' | 'lejano' | 'cercano';

export type ItemRuta = {
  readonly facturaId: string;
  readonly folio?: string;
  readonly localId: string;
  readonly cliente: string;
  readonly direccion: string;
  readonly comuna: string;
  readonly lat?: number;
  readonly lng?: number;
  /** Sin pin exacto todavía: la ruta lo ubica por la comuna o por una búsqueda de la dirección (se afina con el GPS de la entrega). */
  readonly ubicacionAproximada?: boolean;
  /** Sin pin y la dirección ya se buscó en el mapa sin éxito (si falta esto y no hay pin, aún se está buscando). */
  readonly noEncontradaEnMapa?: boolean;
  /** El local tiene foto de la fachada (se pide aparte, con URL firmada). */
  readonly tieneFoto?: boolean;
  /** Insignias ✓: el pin del local está verificado y la foto de su fachada está verificada. */
  readonly pinVerificado?: boolean;
  readonly fotoVerificada?: boolean;
  readonly urgente: boolean;
  readonly antesDeMin?: number;
  readonly nota?: string;
};
export type ParadaDeRuta = ItemRuta & {
  readonly posicion: number;
  readonly llegada: number;
  readonly inicioServicio: number;
  readonly salida: number;
  readonly espera: number;
  readonly atraso: number;
  readonly motivos: readonly Motivo[];
  readonly fijada: boolean;
};
export type SugerenciaRuta = { readonly tipo: 'MOVER_AL_INICIO' | 'SALIR_ANTES' | 'OTRO_CAMION'; readonly minutos?: number; readonly texto: string };
export type VistaRuta = {
  readonly camionId: string;
  readonly fecha: string;
  readonly planificada: boolean;
  /** `carga`: «las agrego en orden», la ruta es el orden en que el chofer cargó las facturas. */
  readonly modo?: 'sugerida' | 'manual' | 'carga';
  readonly version?: number;
  readonly salidaMin: number;
  readonly calculadaDesdeMin?: number;
  readonly horaLimiteRegresoMin: number;
  /** De dónde sale y adónde vuelve el camión: al llegar ahí después de entregar, la ruta termina. */
  readonly deposito?: { readonly lat: number; readonly lng: number; readonly nombre?: string };
  readonly regreso?: number;
  readonly regresoTardio?: boolean;
  readonly paradas: readonly ParadaDeRuta[];
  readonly nuevas: readonly ItemRuta[];
  readonly hechas: readonly (ItemRuta & { readonly estado: 'entregada' | 'no_entregada' })[];
  readonly sinPin: readonly ItemRuta[];
  readonly noAtendidas: readonly (ItemRuta & { readonly conflictos: readonly string[] })[];
  readonly enRiesgo: readonly (ItemRuta & { readonly cierre: number; readonly conflictos: readonly string[]; readonly sugerencias: readonly SugerenciaRuta[] })[];
};
export type OperacionRuta =
  | { readonly tipo: 'subir' | 'bajar' | 'primero' | 'despues' | 'quitar'; readonly facturaId: string }
  /** Arrastrar y soltar: la parada queda en `posicion` (0 = la primera) de la lista de paradas en orden. */
  | { readonly tipo: 'mover'; readonly facturaId: string; readonly posicion: number }
  | { readonly tipo: 'ordenar' | 'insertar' }
  | { readonly tipo: 'salida'; readonly salidaMin: number };

/** Lo que quedó del día al terminar la ruta (las pendientes no se alcanzaron a entregar y quedan en su día). */
export type ResumenJornada = { readonly fecha: string; readonly camionId: string; readonly desde: string; readonly hasta: string; readonly entregadas: number; readonly noEntregadas: number; readonly pendientes: number };
export type PersonaDeCamion = { readonly nombre: string; readonly usuarioId?: string };
/** Lo que dice la planilla del día de un camión: quiénes van, qué comunas hace y con qué vendedores (ADR 0036 del back). */
export type AsignacionDia = {
  readonly fecha: string;
  readonly camion: CamionResumen;
  readonly chofer?: PersonaDeCamion;
  readonly ayudante?: PersonaDeCamion;
  readonly comunas: readonly string[];
  readonly vendedores: readonly Vendedor[];
};
export type Jornada = { readonly id: string; readonly fecha: string; readonly desde: string; readonly camion: CamionResumen; readonly asignacion?: AsignacionDia };
export type { FilaPlanillaEnviada } from '../domain/planilla';
export type EstadoPersona = 'enlazada' | 'sin_usuario';
/** Qué pasó con cada fila al aplicar la planilla. */
export type ResultadoFilaPlanilla = {
  readonly patente: string;
  readonly valida: boolean;
  readonly errores: readonly string[];
  readonly camionCreado: boolean;
  readonly alias?: string;
  readonly vendedoresCreados: number;
  readonly chofer?: { readonly nombre: string; readonly estado: EstadoPersona };
  readonly ayudante?: { readonly nombre: string; readonly estado: EstadoPersona };
  readonly jornadasAbiertas: number;
};

/** Un punto del recorrido del camión (se sigue al camión, no a la persona). */
export type PuntoGps = { readonly lat: number; readonly lng: number; readonly precisionM?: number; readonly velocidadMs?: number; readonly tomadoEn: string };
export type ResultadoPosiciones = { readonly guardados: number; readonly descartados: number; readonly llegadasAutomaticas: readonly string[] };

/** Lo que el sistema aprendió de las rutas reales (ver ADR 0022 del back). */
export type ClaveAprendida = 'ritmo' | 'servicio_min' | 'capacidad_paradas' | 'duracion_jornada_min';
export type ParametroAprendido = { readonly clave: ClaveAprendida; readonly ambito: string; readonly valor: number; readonly muestras: number; readonly confianza: number; readonly camion?: string };
export type EtiquetaLocal = { readonly razonSocial: string; readonly direccion: string; readonly comuna: string };
export type ResumenAnalisis = {
  readonly eventos: number;
  readonly jornadas: number;
  readonly parametros: number;
  readonly jornadasComparadas: number;
  readonly pinesSugeridos: number;
  readonly pinesProponidos: number;
  readonly llegadasDeducidas: number;
  /** Qué tanto se hace lo que la ruta mostraba. */
  readonly seguimientoRuta: { readonly entregas: number; readonly primeraDeLaLista: number; readonly conRutaDelSistema: number; readonly primeraDeLaRutaDelSistema: number };
  readonly cierresFrecuentes: readonly { readonly localId: string; readonly cerrados: number; readonly intentos: number; readonly confianzaAbierto: number; readonly horasCerrado: readonly number[] }[];
};
export type PanelAnalitica = {
  readonly desde: string;
  readonly cobertura: {
    readonly jornadas: number; readonly jornadasTerminadas: number; readonly avisos: number; readonly avisosConGps: number; readonly avisosAutomaticos: number;
    readonly paradasConLlegada: number; readonly paradasResueltas: number; readonly puntosGps: number; readonly ultimoPuntoGps?: string; readonly operacionesRuta: number; readonly correccionesManuales: number;
  };
  /** Locales con el pin verificado (fijo), por verificar (se ajusta con las entregas) y sin pin. */
  readonly pines: { readonly verificados: number; readonly porVerificar: number; readonly sinPin: number };
  readonly porDia: readonly { readonly fecha: string; readonly jornadas: number; readonly atendidas: number; readonly sinHacer: number }[];
  readonly calidad: readonly { readonly fecha: string; readonly camionId: string; readonly camion?: string; readonly distSugeridaM: number; readonly distRealM: number; readonly inversiones: number }[];
  readonly aprendido: {
    readonly ritmo: readonly ParametroAprendido[];
    readonly capacidad: readonly ParametroAprendido[];
    readonly servicioGeneral?: ParametroAprendido;
    readonly localesLentos: readonly (ParametroAprendido & { readonly etiqueta?: EtiquetaLocal })[];
  };
  readonly cierres: readonly { readonly localId: string; readonly cerrados: number; readonly intentos: number; readonly horasCerrado: readonly number[]; readonly etiqueta?: EtiquetaLocal }[];
  /** Locales donde se avisó la entrega con buen GPS lejos del pin. */
  readonly pinesDudosos: readonly { readonly localId: string; readonly distanciaM: number; readonly visitas: number; readonly fuente?: string; readonly etiqueta?: EtiquetaLocal }[];
  readonly ultimaEjecucion?: { readonly iniciadoEn: string; readonly terminadoEn: string; readonly resumen: ResumenAnalisis };
};
