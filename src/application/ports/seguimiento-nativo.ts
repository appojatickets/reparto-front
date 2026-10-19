export type EstadoSeguimientoNativo = { readonly activo: boolean; readonly pendientes: number; readonly ubicacionActiva?: boolean; readonly permisoUbicacion?: boolean; readonly ultimoEnvio?: string };
/** Captura y envío propios del teléfono; no dependen de temporizadores de la web. */
export interface SeguimientoNativo {
  estado(): Promise<EstadoSeguimientoNativo>;
  iniciar(jornadaId: string): Promise<void>;
  detener(): Promise<void>;
}
