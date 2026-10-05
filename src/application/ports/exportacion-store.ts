import type { FormatoCsv, IdColumna } from '../../domain/exportacion';

/** Lo que la persona dejó elegido en la última exportación (columnas y formato), para no marcarlo de nuevo cada vez. */
export type PreferenciaExportacion = { readonly columnas: readonly IdColumna[]; readonly formato: FormatoCsv };

export interface ExportacionStore {
  cargar(): PreferenciaExportacion | undefined;
  guardar(p: PreferenciaExportacion): void;
}
