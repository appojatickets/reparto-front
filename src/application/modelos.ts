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
export type CamionResumen = { readonly id: string; readonly patente: string; readonly alias?: string };

export type Factura = {
  readonly id: string;
  readonly folio: string;
  readonly fecha: string;
  readonly estado: 'pendiente' | 'anulada';
  readonly total?: number;
  readonly antesDeMin?: number;
  readonly urgente: boolean;
  readonly nota?: string;
  readonly camion?: CamionResumen;
  readonly local: { readonly id: string; readonly razonSocial: string; readonly direccion: string; readonly comuna: string; readonly tienePin: boolean };
};
export type NuevaFactura = {
  readonly folio: string;
  readonly localId: string;
  readonly camionId?: string;
  readonly fecha?: string;
  readonly antesDeMin?: number;
  readonly urgente?: boolean;
  readonly nota?: string;
};
/** `null` quita el valor. */
export type CambiosFactura = { readonly camionId?: string | null; readonly estado?: 'pendiente' | 'anulada' };
export type FiltroFacturas = { readonly fecha?: string; readonly incluirAnuladas?: boolean };
