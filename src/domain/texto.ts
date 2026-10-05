/** Minúsculas, sin tildes ni puntuación y con espacios simples (igual criterio que la búsqueda de la API). */
export const normalizar = (texto: string): string =>
  texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

/** Dos textos que dicen lo mismo aunque cambien mayúsculas, tildes o espacios (por ejemplo, el nombre del cliente que es solo su dirección). */
export const mismoTexto = (a: string, b: string): boolean => normalizar(a) === normalizar(b);
