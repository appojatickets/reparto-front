import { createContext, useContext, type ReactNode } from 'react';
import type { Ubicacion } from '../../../application/ports/ubicacion';
import type { TemaStore } from '../../../application/ports/tema-store';
import type { VistaStore } from '../../../application/ports/vista-store';
import type { Voz } from '../../../application/ports/voz';
import type { ApiClient } from '../../../application/ports/api-client';
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
  readonly subirFotoLocal: ReturnType<typeof crearSubirFotoLocal>;
  /** Hora actual (inyectada para que las pantallas con fechas sean comprobables). */
  readonly ahora: () => Date;
  /** Dictado propio de la app (si el navegador lo tiene). */
  readonly voz: Voz;
  /** GPS del teléfono (una lectura al llegar o entregar). */
  readonly ubicacion: Ubicacion;
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
