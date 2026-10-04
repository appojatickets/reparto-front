export type Motivo = 'VENTANA_DURA' | 'PRIORIDAD' | 'CERCANIA_COMUNA' | 'COLACION' | 'FIJADA_POR_CHOFER' | 'MENOR_DESVIO';

/** Por qué el sistema puso una parada en ese lugar, en palabras simples. */
export const TEXTO_MOTIVO: Readonly<Record<Motivo, string>> = {
  VENTANA_DURA: 'Cierra pronto',
  PRIORIDAD: 'Urgente',
  CERCANIA_COMUNA: 'Queda cerca de la anterior',
  COLACION: 'Cierra a mediodía',
  FIJADA_POR_CHOFER: 'La fijaste tú',
  MENOR_DESVIO: 'Es el mejor recorrido',
};

export const textoMotivos = (motivos: readonly Motivo[]): string => motivos.map((m) => TEXTO_MOTIVO[m]).join(' · ');
