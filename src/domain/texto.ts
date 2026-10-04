/** Minúsculas, sin tildes ni puntuación y con espacios simples (igual criterio que la búsqueda de la API). */
export const normalizar = (texto: string): string =>
  texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
