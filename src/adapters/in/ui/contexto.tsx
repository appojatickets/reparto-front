import { createContext, useContext, type ReactNode } from 'react';
import type { Ubicacion } from '../../../application/ports/ubicacion';
import type { TemaStore } from '../../../application/ports/tema-store';
import type { VistaStore } from '../../../application/ports/vista-store';
import type { Permisos } from '../../../application/ports/permisos';
import type { Voz } from '../../../application/ports/voz';
import type { Descarga } from '../../../application/ports/descarga';
import type { ExportacionStore } from '../../../application/ports/exportacion-store';
import type { ApiClient } from '../../../application/ports/api-client';
import type { crearBuscarDireccion } from '../../../application/use-cases/buscar-direccion';
import type { crearCompletarComunas } from '../../../application/use-cases/completar-comunas';
import type { crearAplicarHorariosDeNotas } from '../../../application/use-cases/horarios-de-notas';
import type { crearImportarEnlaces } from '../../../application/use-cases/importar-enlaces';
import type { crearImportarClientesEnLotes } from '../../../application/use-cases/importar-clientes';
import type { crearCerrarSesion, crearIniciarSesion, crearRestaurarSesion } from '../../../application/use-cases/sesion';
import type { crearSubirFotoLocal } from '../../../application/use-cases/subir-foto';

/** Lo que la interfaz recibe de `main`: la API (para consultas simples) y los casos de uso con lógica propia. */
export type Casos = {
  readonly api: ApiClient;
  readonly iniciarSesion: ReturnType<typeof crearIniciarSesion>;
  readonly restaurarSesion: ReturnType<typeof crearRestaurarSesion>;
  readonly cerrarSesion: ReturnType<typeof crearCerrarSesion>;
  readonly importarClientesEnLotes: ReturnType<typeof crearImportarClientesEnLotes>;
  /** Carga una lista de direcciones con enlace de Google Maps (crea los clientes y fija los pines de los enlaces cortos). */
  readonly importarEnlaces: ReturnType<typeof crearImportarEnlaces>;
  /** Convierte en horario de atención lo que dicen las notas de los clientes (sin pisar horarios ya cargados). */
  readonly aplicarHorariosDeNotas: ReturnType<typeof crearAplicarHorariosDeNotas>;
  /** Busca la comuna de un pin en OpenStreetMap (para la importación de listas de Google Maps). */
  /** Busca en el mapa gratuito una dirección nueva (una consulta por toque) y propone lugares para elegir. */
  readonly buscarDireccion: ReturnType<typeof crearBuscarDireccion>;
  readonly completarComunas: ReturnType<typeof crearCompletarComunas>;
  readonly subirFotoLocal: ReturnType<typeof crearSubirFotoLocal>;
  /** Guarda un archivo de texto en el dispositivo (la exportación de datos). */
  readonly descarga: Descarga;
  /** Columnas y formato de la última exportación, recordados en el dispositivo. */
  readonly exportacion: ExportacionStore;
  /** Hora actual (inyectada para que las pantallas con fechas sean comprobables). */
  readonly ahora: () => Date;
  /** Dictado propio de la app (si el navegador lo tiene). */
  readonly voz: Voz;
  /** GPS del teléfono (una lectura al llegar o entregar, y una por minuto mientras la app está abierta). */
  readonly ubicacion: Ubicacion;
  /** Permisos de ubicación y micrófono, que se piden al abrir la app. */
  readonly permisos: Permisos;
  /** Vista elegida (grande o normal), recordada en el teléfono. */
  readonly vista: VistaStore;
  /** Colores elegidos (claro u oscuro), recordados en el teléfono. */
  readonly tema: TemaStore;
};

const Contexto = createContext<Casos | undefined>(undefined);

export const ProveedorCasos = ({ casos, children }: { readonly casos: Casos; readonly children: ReactNode }) => (
  <Contexto.Provider value={casos}>{children}</Contexto.Provider>
);

export const useCasos = (): Casos => {
  const c = useContext(Contexto);
  if (!c) throw new Error('Falta ProveedorCasos');
  return c;
};
