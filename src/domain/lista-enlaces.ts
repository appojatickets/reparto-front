import { separarComuna } from './comunas';
import { esListaDeMaps } from './lista-maps';
import { normalizar } from './texto';

/**
 * Una lista de direcciones, cada una con su enlace de Google Maps (el que da «Compartir» o la búsqueda de la dirección):
 *
 *   Avenida Portales 4180, San Bernardo
 *   https://maps.app.goo.gl/Unz8sebYG5ooFVh66
 *
 * Sirve para cargar cientos de clientes de una vez. El enlace corto trae el lugar exacto (el servidor lo lee y fija el pin);
 * el enlace de búsqueda solo repite la dirección, así que ese pin lo busca el sistema por la dirección.
 */

export type TipoEnlace = 'corto' | 'busqueda' | 'otro';
export type EntradaEnlace = {
  readonly numero: number;
  readonly crudo: string;
  readonly estado: 'lista' | 'revisar' | 'repetida';
  readonly motivos: readonly string[];
  readonly direccion?: string;
  readonly comuna?: string;
  readonly enlace?: string;
  readonly tipoEnlace?: TipoEnlace;
};
export type ResumenEnlaces = { readonly total: number; readonly listas: number; readonly revisar: number; readonly repetidas: number; readonly conLugarExacto: number; readonly porBusqueda: number };

const ENLACE = /https?:\/\/\S+/i;
const HOST_GOOGLE = /^(?:www\.)?(?:google\.[a-z.]+|maps\.google\.[a-z.]+)$/i;

export const esListaDeEnlaces = (texto: string): boolean => !esListaDeMaps(texto) && texto.split(/\r?\n/).some((l) => ENLACE.test(l) && tipoDeEnlace(l.match(ENLACE)?.[0] ?? '') !== undefined);

const urlDe = (texto: string): URL | undefined => {
  try {
    return new URL(texto);
  } catch {
    return undefined;
  }
};

export const tipoDeEnlace = (texto: string): TipoEnlace | undefined => {
  const u = urlDe(texto);
  if (!u) return undefined;
  const host = u.hostname.toLowerCase();
  if (host === 'maps.app.goo.gl' || (host === 'goo.gl' && u.pathname.startsWith('/maps'))) return 'corto';
  if (!HOST_GOOGLE.test(host) || !u.pathname.startsWith('/maps')) return undefined;
  return u.pathname.startsWith('/maps/search') && u.searchParams.has('query') ? 'busqueda' : 'otro';
};

/** La dirección que lleva escrita un enlace de búsqueda (query=Los+Suspiros+16463+San+Bernardo%2C+Chile). */
const direccionDeBusqueda = (enlace: string): string | undefined => urlDe(enlace)?.searchParams.get('query') ?? undefined;

const limpiarDireccion = (t: string): string => t.replace(/[,;\s]+Chile\s*$/iu, '').replace(/\s+/g, ' ').replace(/^[\s,;-]+|[\s,;-]+$/gu, '').trim();

const crear = (numero: number, crudo: string, texto: string | undefined, enlace: string | undefined): EntradaEnlace => {
  const tipoEnlace = enlace !== undefined ? tipoDeEnlace(enlace) : undefined;
  const base = texto !== undefined && texto.trim() !== '' ? texto : tipoEnlace === 'busqueda' && enlace !== undefined ? direccionDeBusqueda(enlace) : undefined;
  const limpio = base !== undefined ? limpiarDireccion(base) : '';
  const { consulta, comuna } = separarComuna(limpio);
  const motivos: string[] = [];
  if (limpio === '') motivos.push('Falta la dirección.');
  else if (comuna === undefined) motivos.push('Falta la comuna: la dirección debe terminar con ella (por ejemplo «… 4180, San Bernardo»).');
  if (enlace !== undefined && tipoEnlace === undefined) motivos.push('El enlace no es de Google Maps: se importa solo la dirección.');
  const estado = limpio === '' || comuna === undefined ? 'revisar' : 'lista';
  return {
    numero,
    crudo,
    estado,
    motivos,
    ...(limpio !== '' ? { direccion: comuna !== undefined ? consulta : limpio } : {}),
    ...(comuna !== undefined ? { comuna } : {}),
    ...(enlace !== undefined && tipoEnlace !== undefined ? { enlace, tipoEnlace } : {}),
  };
};

const clave = (e: EntradaEnlace): string => `${normalizar(e.direccion ?? '')}|${e.comuna ?? ''}`;
const valorEnlace = (e: EntradaEnlace): number => (e.tipoEnlace === 'corto' || e.tipoEnlace === 'otro' ? 2 : e.tipoEnlace === 'busqueda' ? 1 : 0);

export const analizarListaEnlaces = (texto: string): { readonly entradas: readonly EntradaEnlace[]; readonly resumen: ResumenEnlaces } => {
  const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '');
  const crudas: EntradaEnlace[] = [];
  let pendiente: string | undefined;
  const agregar = (crudo: string, direccion: string | undefined, enlace: string | undefined): void => {
    crudas.push(crear(crudas.length + 1, crudo, direccion, enlace));
  };
  for (const linea of lineas) {
    const url = linea.match(ENLACE)?.[0];
    if (url === undefined) {
      if (pendiente !== undefined) agregar(pendiente, pendiente, undefined);
      pendiente = linea;
      continue;
    }
    const antes = linea.slice(0, linea.indexOf(url)).trim();
    const direccion = antes !== '' ? antes : pendiente;
    agregar(direccion !== undefined ? `${direccion} ${url}` : url, direccion, url);
    pendiente = undefined;
  }
  if (pendiente !== undefined) agregar(pendiente, pendiente, undefined);

  // Una misma dirección repetida entra una sola vez, con el mejor enlace (el que trae el lugar exacto).
  const mejor = new Map<string, EntradaEnlace>();
  for (const e of crudas) {
    if (e.estado !== 'lista') continue;
    const k = clave(e);
    const previa = mejor.get(k);
    if (!previa || valorEnlace(e) > valorEnlace(previa)) mejor.set(k, e);
  }
  const entradas = crudas.map((e): EntradaEnlace => (e.estado === 'lista' && mejor.get(clave(e)) !== e ? { ...e, estado: 'repetida', motivos: ['Repetida: la misma dirección ya está en la lista.'] } : e));
  const contar = (estado: EntradaEnlace['estado']): number => entradas.filter((e) => e.estado === estado).length;
  const listas = entradas.filter((e) => e.estado === 'lista');
  return {
    entradas,
    resumen: {
      total: entradas.length,
      listas: listas.length,
      revisar: contar('revisar'),
      repetidas: contar('repetida'),
      conLugarExacto: listas.filter((e) => e.tipoEnlace === 'corto' || e.tipoEnlace === 'otro').length,
      porBusqueda: listas.filter((e) => e.tipoEnlace === undefined || e.tipoEnlace === 'busqueda').length,
    },
  };
};

