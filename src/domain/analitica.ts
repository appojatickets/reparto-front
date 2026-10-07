
/** «32 de 40 (80 %)», o un guion si no hay con qué comparar. */
export const proporcion = (parte: number, total: number): string => (total <= 0 ? '—' : `${parte} de ${total} (${Math.round((parte / total) * 100)} %)`);

/** Qué tanta confianza tiene lo aprendido, en palabras (0 a 1). */
export const nivelDeConfianza = (c: number): 'baja' | 'media' | 'alta' => (c < 0.25 ? 'baja' : c < 0.6 ? 'media' : 'alta');

/** De qué es el valor aprendido: de un camión, de una comuna o de todos. */
export const aQuienAplica = (p: { readonly ambito: string; readonly camion?: string }): string => {
  if (p.ambito === 'global') return 'Todos los camiones';
  if (p.ambito.startsWith('camion:')) return `Camión ${p.camion ?? p.ambito.slice(7, 15)}`;
  if (p.ambito.startsWith('comuna:')) return `Hacia ${p.ambito.slice(7)}`;
  return p.ambito;
};

/** El ritmo como se entiende: 1,20 → «20 % más lento que lo calculado». */
export const textoDeRitmo = (ritmo: number): string => {
  const pct = Math.round((ritmo - 1) * 100);
  return Math.abs(pct) < 3 ? 'como lo calculado' : pct > 0 ? `${pct} % más lento que lo calculado` : `${-pct} % más rápido que lo calculado`;
};

export const kilometros = (metros: number): string => `${(metros / 1000).toFixed(1).replace('.', ',')} km`;

/** Cuánto más (o menos) largo fue el recorrido manejado que el sugerido, en promedio; undefined si no hay con qué comparar. */
export const diferenciaPromedio = (calidad: readonly { readonly distSugeridaM: number; readonly distRealM: number }[]): number | undefined => {
  const validas = calidad.filter((c) => c.distSugeridaM > 0);
  if (validas.length === 0) return undefined;
  return validas.reduce((s, c) => s + (c.distRealM - c.distSugeridaM) / c.distSugeridaM, 0) / validas.length;
};

export const textoDeDiferencia = (d: number): string => {
  const pct = Math.round(d * 100);
  return Math.abs(pct) < 1 ? 'Lo manejado fue igual de largo que lo sugerido.' : pct > 0 ? `Lo manejado fue ${pct} % más largo que lo sugerido.` : `Lo manejado fue ${-pct} % más corto que lo sugerido.`;
};

export const textoDeHoras = (horas: readonly number[]): string => horas.map((h) => `${String(h).padStart(2, '0')}:00`).join(', ');

/** De dónde vino el pin de un local, en palabras. */
export const textoDeFuentePin = (fuente: string): string => {
  switch (fuente) {
    case 'geocodificador': return 'la búsqueda por dirección';
    case 'chofer': return 'la posición de un chofer';
    case 'enlace': return 'un enlace de Google Maps';
    case 'importado': return 'la planilla importada';
    case 'manual': return 'una persona';
    case 'aprendido': return 'las visitas';
    default: return fuente;
  }
};
