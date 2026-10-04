/** Fechas de reparto como `AAAA-MM-DD`, siempre en hora de Chile (la misma regla que usa la API). */
const ZONA = 'America/Santiago';

export const fechaEnChile = (instante: Date): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instante);

export const sumarDias = (fecha: string, dias: number): string => {
  const [a, m, d] = fecha.split('-').map(Number);
  const f = new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, (d ?? 1) + dias));
  return f.toISOString().slice(0, 10);
};

/** «lunes 5 de octubre» */
export const fechaLarga = (fecha: string): string => {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CL', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, d ?? 1)));
};

/** Minutos transcurridos del día en Chile (0..1439) para un instante dado. */
export const minutosEnChile = (instante: Date): number => {
  const partes = new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instante);
  const h = Number(partes.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(partes.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
};
