import { normalizar } from '../../domain/texto';

/** El autocompletado arranca desde la 3.ª letra (con menos, la lista sería demasiado larga y poco útil). */
export const LARGO_MINIMO_BUSQUEDA = 3;
export const puedeBuscar = (texto: string): boolean => normalizar(texto).replace(/\s/g, '').length >= LARGO_MINIMO_BUSQUEDA;
