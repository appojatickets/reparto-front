/** Hora del día como minutos desde las 00:00 (la API usa `antesDeMin`). */
export const minutosDeHora = (texto: string): number | undefined => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(texto.trim());
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h <= 23 && min <= 59 ? h * 60 + min : undefined;
};

/** 810 → «13:30» (valor de `<input type="time">` y texto en pantalla). */
export const horaDeMinutos = (minutos: number): string =>
  `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

/** Hora estimada que puede pasar de medianoche (1500 → «01:00»). */
export const horaDelDia = (minutos: number): string => horaDeMinutos(((Math.round(minutos) % 1440) + 1440) % 1440);
