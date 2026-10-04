/** AB1234 → «AB·1234», BCDF12 → «BCDF·12» (más fácil de leer en el camión). */
export const formatearPatente = (p: string): string => p.replace(/^([A-Z]+)(\d+)$/, '$1·$2');
