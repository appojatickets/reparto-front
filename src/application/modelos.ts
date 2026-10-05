import type { Motivo } from '../domain/motivos';
import type { Rol } from '../domain/rol';
import type { FilaClienteCruda } from '../domain/tabla';

export type UsuarioSesion = { readonly id: string; readonly username: string; readonly nombre: string; readonly rol: Rol };
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
  readonly fotoPath?: string;
  readonly streetviewRumbo?: number;
  readonly nota?: string;
};

export type LocalDetalle = Omit<ResultadoBusqueda, 'localId'> & { readonly id: string; readonly rut?: string };

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
export type PinCrudo = { readonly rut?: string; readonly direccion?: string; readonly lat?: string; readonly lng?: string };
export type ResultadoPines = { readonly recibidas: number; readonly pendientes: number; readonly sinLocal: number; readonly errores: readonly ErrorFila[] };

export type UsuarioAdmin = UsuarioSesion & { readonly activo: boolean };
export type NuevoUsuario = { readonly nombre: string; readonly apellidoPaterno: string; readonly apellidoMaterno?: string; readonly rol: Rol; readonly pin: string };

export type TipoFoto = 'webp' | 'jpeg';
export type FilaCliente = FilaClienteCruda;

export type Camion = { readonly id: string; readonly patente: string; readonly alias?: string; readonly activo: boolean };
export type Vendedor = { readonly id: string; readonly codigo: string; readonly nombre: string; readonly celular?: string; readonly activo: boolean };
export type ResultadoPinEnlace = { readonly resultado: 'fijado' | 'propuesto'; readonly lat: number; readonly lng: number };
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
};

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
  readonly modo?: 'sugerida' | 'manual';
  readonly version?: number;
  readonly salidaMin: number;
  readonly calculadaDesdeMin?: number;
  readonly horaLimiteRegresoMin: number;
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
  | { readonly tipo: 'ordenar' | 'insertar' }
  | { readonly tipo: 'salida'; readonly salidaMin: number };

export type Jornada = { readonly id: string; readonly fecha: string; readonly desde: string; readonly camion: CamionResumen };
