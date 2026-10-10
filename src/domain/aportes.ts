export type AporteAlLocal = 'foto' | 'pin' | 'entregas';

/** Lo que aportó alguien a un local, en palabras: «Subió la foto · Verificó el pin · 3 entregas». */
export const textoDeAportes = (aportes: readonly AporteAlLocal[], entregas: number): string =>
  aportes
    .map((a) => (a === 'foto' ? 'Subió la foto' : a === 'pin' ? 'Verificó el pin' : `${entregas} ${entregas === 1 ? 'entrega' : 'entregas'}`))
    .join(' · ');

/** El resumen de la fila cerrada: «Juan Pérez», «Juan Pérez y María Rojas» o «Juan Pérez y 2 más». */
export const resumenDeQuienesAportaron = (nombres: readonly string[]): string => {
  const [a, b] = nombres;
  if (a === undefined) return '';
  if (b === undefined) return a;
  return nombres.length === 2 ? `${a} y ${b}` : `${a} y ${nombres.length - 1} más`;
};
