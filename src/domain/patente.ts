/** AB1234 → «AB·1234», BCDF12 → «BCDF·12» (más fácil de leer en el camión). */
export const formatearPatente = (p: string): string => p.replace(/^([A-Z]+)(\d+)$/, '$1·$2');

/** «Camión 3 · AB·1234» si tiene nombre; si no, solo la patente. */
export const nombreDeCamion = (c: { readonly patente: string; readonly alias?: string | undefined }): string => (c.alias ? `${c.alias} · ${formatearPatente(c.patente)}` : formatearPatente(c.patente));
