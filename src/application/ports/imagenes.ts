import type { Result } from '../../domain/result';
import type { TipoFoto } from '../modelos';

export type FotoComprimida = { readonly blob: Blob; readonly tipo: TipoFoto };

export interface Imagenes {
  /** Reduce la foto de fachada a ~120 KB (la cuota de Storage y la salida de datos son limitadas). */
  comprimir(archivo: Blob): Promise<Result<FotoComprimida, { readonly detalle: string }>>;
}

export interface SubidaDeArchivos {
  /** Sube directo a la URL firmada del almacenamiento (la API nunca recibe los bytes). */
  subir(url: string, foto: FotoComprimida): Promise<Result<void, { readonly detalle: string }>>;
}
