export type EventoVoz = { readonly texto: string; readonly final: boolean };
export type ErrorVoz = 'PERMISO' | 'SIN_VOZ' | 'RED' | 'OTRO';

/** Dictado propio de la app (reconocimiento de voz del navegador). Si no existe, el chofer usa el micrófono del teclado. */
export interface Voz {
  readonly disponible: boolean;
  escuchar(manejadores: { alTexto: (e: EventoVoz) => void; alTerminar: (error?: ErrorVoz) => void }): { detener: () => void };
}
