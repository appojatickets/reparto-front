import { comunaDelPin, separarComuna, COMUNAS_RM } from './comunas';
import { leerCoordenadas } from './coordenadas';
import { normalizar } from './texto';
import type { FilaClienteCruda } from './tabla';

/**
 * Lee lo que se copia de una lista de Google Maps (pines puestos en el lugar, ubicaciones compartidas por WhatsApp y fichas de
 * Google, cada una con la nota que escribió el equipo) y lo ordena en clientes: razón social, dirección, comuna, pin, giro y nota.
 * Es tolerante: lo que no se puede entender queda «para revisar» con el motivo, nunca se inventa.
 */

export type OrigenMapa = 'pin_colocado' | 'ubicacion_compartida' | 'ficha_google';
/** lista: se puede importar tal cual · aproximada: solo hay una referencia («Cerca de …») · revisar: falta algo · descartada: cerrado para siempre. */
export type EstadoEntrada = 'lista' | 'aproximada' | 'revisar' | 'descartada';

export type EntradaMapa = {
  readonly numero: number;
  readonly crudo: string;
  readonly origen: OrigenMapa;
  readonly estado: EstadoEntrada;
  readonly motivos: readonly string[];
  readonly razonSocial?: string;
  readonly direccion?: string;
  readonly comuna?: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly giro?: string;
  readonly nota?: string;
  /** La comuna no estaba escrita: se calculó por la cercanía del pin. */
  readonly comunaEstimada?: boolean;
};

export type ResumenLista = {
  readonly total: number;
  readonly listas: number;
  readonly aproximadas: number;
  readonly revisar: number;
  readonly descartadas: number;
  readonly conPin: number;
  readonly sinPinEnElTexto: number;
  readonly comunaEstimada: number;
};

export const esListaDeMaps = (texto: string): boolean => /^\s*(Pin colocado|Ubicaci[oó]n compartida)\s*$/im.test(texto);

// ---------- limpieza de texto ----------

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'con']);
const SIGLAS: Readonly<Record<string, string>> = { spa: 'SpA', eirl: 'EIRL', 'e.i.r.l': 'EIRL', 'e.i.r.l.': 'EIRL', ltda: 'Ltda', 'ltda.': 'Ltda.', sn: 'S/N', 's/n': 'S/N', 's-n': 'S/N', km: 'Km', rya: 'RyA' };

const mayuscula = (p: string): string => (p === '' ? p : (p.charAt(0).toLocaleUpperCase('es-CL') + p.slice(1)));

/** «rosa del carmen gonzalez osses» → «Rosa del Carmen Gonzalez Osses»; spa → SpA, eirl → EIRL. */
export const ordenarTexto = (texto: string): string =>
  texto
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((palabra, i) => {
      const minuscula = palabra.toLocaleLowerCase('es-CL');
      const sigla = SIGLAS[minuscula];
      if (sigla !== undefined) return sigla;
      if (i > 0 && PARTICULAS.has(minuscula)) return minuscula;
      if (/\d/.test(minuscula)) return minuscula.replace(/(^|[^\p{L}])(\p{L})/gu, (_m, a: string, b: string) => a + b.toLocaleUpperCase('es-CL')).replace(/(\d)(\p{L})$/u, (_m, d: string, l: string) => d + l.toLocaleUpperCase('es-CL'));
      return minuscula.split(/(-|\/|\.)/).map(mayuscula).join('');
    })
    .join(' ');

// ---------- reconocer líneas ----------

const RE_COORDENADAS = /^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/;
const RE_DMS = /^(\d{1,2})°\s*(\d{1,2})['′]\s*([\d.]+)["″]?\s*([NS])\s+(\d{1,3})°\s*(\d{1,2})['′]\s*([\d.]+)["″]?\s*([EOW])$/i;
const RE_VALORACION = /^\d(?:[.,]\d)?\s*\(\d[\d.,]*\)$/;
const RE_REGION = /^(Región Metropolitana|O'Higgins|Valparaíso|Libertador General Bernardo O'Higgins|Región de [\p{L} ]+)$/iu;
const RE_YA_NO_EXISTE = /^este lugar ya no existe$/i;
const RE_CERRADO_PERMANENTE = /^cerrado permanentemente$/i;
const RE_CERRADO_TEMPORAL = /^cerrado temporalmente$/i;
const RE_TELEFONO = /(?:\+?56\s?)?9[\s-]?\d{4}[\s-]?\d{4}\b/;
const RE_HORARIO = /horario|\babre\b|\bcierra|\brecib[eo]\b|\b\d{1,2}\s?(?:am|pm|hrs?)\b|\b\d{1,2}:\d{2}|\bdesde las\b|primera hora|entregar temprano|\bde \d{1,2}\s?(?:a|hasta)\b/i;
const RE_CALLE_FUERTE = /\b(camino|cam|av|avda|avenida|calle|pasaje|pje|psj|parcela|sitio|lote|ruta|poblaci[oó]n|condominio|s\/n|s-n|km|paradero)\b\.?/i;
const RE_CALLE_DEBIL = /\b(local|loc|casa|villa|nº|n°)\b\.?/i;
const PALABRA_SUELTA_DE_DIRECCION = new Set(['parcela', 'sitio', 'lote', 'casa', 'local', 'calle', 'camino', 'pasaje', 'avenida']);
const RE_FUERA_DE_RM = /^(o'higgins|valpara[ií]so|libertador general bernardo o'higgins|regi[oó]n de [\p{L} ]+)$/iu;
const RE_SOSPECHOSO = /^(\p{L}{1,3})\1{2,}$|(\p{L}{2,4})\2{3,}/iu;
const RE_SUFIJO_EMPRESA = /\b(spa|ltda|limitada|eirl|e\.i\.r\.l|sociedad|comercial|inversiones|distribuidora|comercializadora|minimarket|almac[eé]n|botiller[ií]a|panader[ií]a|supermercado|restaurant|restor[aá]n)\b/i;

const CATEGORIAS = new Set([
  'tienda general', 'tienda de alimentacion', 'tienda de golosinas', 'tienda de articulos para el hogar', 'tienda de cuberteria', 'ferreteria',
  'restaurante', 'restaurante de comida rapida', 'supermercado', 'comercio', 'heladeria', 'veterinario', 'cafeteria', 'mercado', 'almacen',
  'jardin de infancia', 'cafeteria y pasteleria', 'panaderia', 'botilleria', 'tienda de abarrotes',
]);

const esCategoria = (l: string): boolean => CATEGORIAS.has(normalizar(l));

const dms = (g: string, m: string, s: string, hemisferio: string): number => {
  const valor = Number(g) + Number(m) / 60 + Number(s) / 3600;
  return /[SWO]/i.test(hemisferio) ? -valor : valor;
};

const leerPunto = (linea: string): { lat: number; lng: number } | undefined => {
  const d = RE_COORDENADAS.exec(linea);
  if (d?.[1] !== undefined && d[2] !== undefined) return { lat: Number(d[1]), lng: Number(d[2]) };
  const g = RE_DMS.exec(linea);
  if (g?.[1] && g[2] && g[3] && g[4] && g[5] && g[6] && g[7] && g[8]) {
    return { lat: Number(dms(g[1], g[2], g[3], g[4]).toFixed(6)), lng: Number(dms(g[5], g[6], g[7], g[8]).toFixed(6)) };
  }
  return undefined;
};

/** Sectores y localidades que la gente usa como si fueran comuna (y que Google a veces trae en la dirección). */
const SECTORES: Readonly<Record<string, string>> = {
  'til til': 'Tiltil', chicureo: 'Colina', batuco: 'Lampa', polpaico: 'Tiltil', pomaire: 'Melipilla', huelquen: 'Paine', chada: 'Paine', champa: 'Paine',
  aculeo: 'Paine', 'el transito': 'Paine', hospital: 'Paine', 'alto jahuel': 'Buin', linderos: 'Buin', 'valdivia de paine': 'Buin', 'la islita': 'Isla de Maipo',
  'el canelo': 'San José de Maipo', 'lo arcaya': 'Pirque', 'santa ana de trebulco': 'Talagante',
};

const comunaDeTexto = (t: string): string | undefined => {
  const limpio = t.replace(/^\d{5,7}\s+/, '').trim();
  const n = normalizar(limpio);
  return COMUNAS_RM.find((c) => normalizar(c) === n) ?? SECTORES[n];
};

/** Último recurso: un sector o una comuna escritos en cualquier parte de la dirección («chicureo parcela 1»). */
const comunaEnTexto = (texto: string): string | undefined => {
  const n = ` ${normalizar(texto)} `;
  const sector = Object.keys(SECTORES).find((s) => n.includes(` ${s} `));
  if (sector !== undefined) return SECTORES[sector];
  return COMUNAS_RM.find((c) => n.includes(` ${normalizar(c)} `));
};

/** De «Cerca de Av. X 12, 9540000 Paine, Región Metropolitana» saca la comuna y la referencia sin comuna ni región. */
const leerReferencia = (texto: string): { comuna?: string; referencia?: string; fuera?: boolean } => {
  const trozos = texto.split(',').map((t) => t.trim()).filter((t) => t !== '');
  let comuna: string | undefined;
  for (let i = trozos.length - 1; i >= 0; i--) {
    const c = comunaDeTexto(trozos[i] ?? '');
    if (c) {
      comuna = c;
      break;
    }
  }
  const utiles = trozos.filter((t) => !RE_REGION.test(t) && comunaDeTexto(t) === undefined && !/^\d{5,7}\s/.test(t));
  const referencia = utiles[0];
  const fuera = trozos.some((t) => RE_FUERA_DE_RM.test(t) && !/metropolitana/i.test(t));
  return { ...(comuna ? { comuna } : {}), ...(referencia !== undefined && referencia.length >= 4 ? { referencia } : {}), ...(fuera ? { fuera } : {}) };
};

type TipoLinea = 'telefono' | 'horario' | 'direccion' | 'nombre';
const clasificar = (l: string): TipoLinea => {
  if (RE_TELEFONO.test(l)) return 'telefono';
  const tieneCalle = RE_CALLE_FUERTE.test(l) || (RE_CALLE_DEBIL.test(l) && /\d/.test(l));
  if (RE_HORARIO.test(l) && !(tieneCalle && /\d{2,}/.test(l.replace(RE_HORARIO, '')))) return 'horario';
  if (tieneCalle) return 'direccion';
  if (/\d/.test(l)) return RE_SUFIJO_EMPRESA.test(l) ? 'nombre' : 'direccion';
  return 'nombre';
};

// ---------- entradas ----------

const esMarca = (l: string): OrigenMapa | undefined => (/^pin colocado$/i.test(l) ? 'pin_colocado' : /^ubicaci[oó]n compartida$/i.test(l) ? 'ubicacion_compartida' : undefined);

const esFichaGoogle = (lineas: readonly string[]): boolean =>
  lineas.some((l) => RE_VALORACION.test(l) || RE_REGION.test(l) || RE_YA_NO_EXISTE.test(l) || RE_CERRADO_PERMANENTE.test(l) || RE_CERRADO_TEMPORAL.test(l));

/** Parte el texto en entradas. Los bloques sueltos de una o dos líneas se pegan a la entrada anterior si a esta le falta el nombre o la dirección. */
const separarEntradas = (texto: string): string[][] => {
  const bloques = texto
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((b) => b.split('\n').map((l) => l.trim()).filter((l) => l !== ''))
    .filter((b) => b.length > 0);
  const entradas: string[][] = [];
  const faltaAlgo = (e: readonly string[]): boolean => {
    const notas = e.filter((l) => !esMarca(l) && !leerPunto(l) && !/^cerca de /i.test(l) && !RE_VALORACION.test(l) && !RE_REGION.test(l) && !esCategoria(l));
    const tipos = notas.map((l) => clasificar(l.replace(/^\+(?!\d)\s*/, '')));
    return !tipos.includes('nombre') || !tipos.includes('direccion');
  };
  for (const b of bloques) {
    const previa = entradas[entradas.length - 1];
    const huerfano = b.length <= 2 && !esMarca(b[0] ?? '') && !esFichaGoogle(b) && !leerPunto(b[0] ?? '') && !/^cerca de /i.test(b[0] ?? '');
    if (huerfano && previa && faltaAlgo(previa)) previa.push(...b);
    else entradas.push(b);
  }
  return entradas;
};

const unirNota = (partes: readonly (string | undefined)[]): string | undefined => {
  const nota = partes.filter((p): p is string => p !== undefined && p !== '').join(' · ');
  return nota === '' ? undefined : nota.slice(0, 500);
};

const analizarEntrada = (lineas: readonly string[], numero: number): EntradaMapa => {
  const crudo = lineas.join('\n');
  const motivos: string[] = [];
  let origen: OrigenMapa = 'ficha_google';
  let punto: { lat: number; lng: number } | undefined;
  let referencia: { comuna?: string; referencia?: string; fuera?: boolean } = {};
  let comunaGoogle: string | undefined;
  let calleGoogle: string | undefined;
  let tituloGoogle: string | undefined;
  let giro: string | undefined;
  let yaNoExiste = false;
  let cerradoPermanente = false;
  let cerradoTemporal = false;
  const usadas = new Set<number>();

  const iRegion = lineas.findIndex((l) => RE_REGION.test(l));
  const iValoracion = lineas.findIndex((l) => RE_VALORACION.test(l));

  for (const [i, l] of lineas.entries()) {
    const marca = esMarca(l);
    if (marca) {
      origen = marca;
      usadas.add(i);
    } else if (leerPunto(l)) {
      punto = leerPunto(l);
      usadas.add(i);
    } else if (/^cerca de /i.test(l)) {
      referencia = leerReferencia(l.replace(/^cerca de /i, ''));
      usadas.add(i);
    } else if (RE_YA_NO_EXISTE.test(l)) {
      yaNoExiste = true;
      usadas.add(i);
    } else if (RE_CERRADO_PERMANENTE.test(l)) {
      cerradoPermanente = true;
      usadas.add(i);
    } else if (RE_CERRADO_TEMPORAL.test(l)) {
      cerradoTemporal = true;
      usadas.add(i);
    } else if (RE_VALORACION.test(l)) usadas.add(i);
  }

  // Ficha de Google con valoración: título · valoración · categoría.
  if (iValoracion > 0) {
    tituloGoogle = lineas[iValoracion - 1];
    usadas.add(iValoracion - 1);
    const sig = lineas[iValoracion + 1];
    if (sig !== undefined && !usadas.has(iValoracion + 1)) {
      giro = sig;
      usadas.add(iValoracion + 1);
    }
  } else if (iRegion < 0) {
    // Sin valoración: «título · categoría» si la segunda línea es una categoría conocida.
    const iCat = lineas.findIndex((l, i) => i > 0 && !usadas.has(i) && esCategoria(l));
    if (iCat > 0 && !usadas.has(iCat - 1)) {
      tituloGoogle = lineas[iCat - 1];
      giro = lineas[iCat];
      usadas.add(iCat - 1);
      usadas.add(iCat);
    }
  }
  // Dirección de Google: [calle] · [código postal + comuna] · Región.
  if (iRegion >= 0) {
    usadas.add(iRegion);
    const localidad = lineas[iRegion - 1];
    if (localidad !== undefined && !usadas.has(iRegion - 1)) {
      const trozos = localidad.split(',').map((t) => t.trim());
      for (let k = trozos.length - 1; k >= 0 && comunaGoogle === undefined; k--) comunaGoogle = comunaDeTexto(trozos[k] ?? '');
      usadas.add(iRegion - 1);
      const calle = lineas[iRegion - 2];
      if (calle !== undefined && !usadas.has(iRegion - 2) && (comunaGoogle !== undefined || /\d/.test(calle))) {
        calleGoogle = calle;
        usadas.add(iRegion - 2);
      }
    }
  }
  if ((iRegion >= 0 && /O'Higgins|Valpara/i.test(lineas[iRegion] ?? '')) || referencia.fuera) motivos.push('Está fuera de la Región Metropolitana.');

  // Lo que queda es la nota que escribió el equipo.
  const notas = lineas.flatMap((l, i) => (usadas.has(i) ? [] : [l.replace(/^\+(?!\d)\s*/, '').trim()])).filter((l) => l !== '' && l !== '+');
  const nombres: string[] = [];
  const direcciones: string[] = [];
  const horarios: string[] = [];
  const telefonos: string[] = [];
  let comunaEscrita: string | undefined;
  for (const l of notas) {
    const suelta = comunaDeTexto(l);
    if (suelta) {
      comunaEscrita ??= suelta;
      continue;
    }
    if (PALABRA_SUELTA_DE_DIRECCION.has(normalizar(l))) continue;
    const tipo = clasificar(l);
    if (tipo === 'telefono') telefonos.push(l);
    else if (tipo === 'horario') horarios.push(l);
    else if (tipo === 'direccion') direcciones.push(l);
    else nombres.push(l);
  }

  const direccionEscrita = [...direcciones].sort((a, b) => Number(/\d/.test(b)) - Number(/\d/.test(a)) || b.length - a.length)[0];
  const otrasDirecciones = direcciones.filter((d) => d !== direccionEscrita);
  let direccion = direccionEscrita;
  let comuna = comunaEscrita;
  if (direccion !== undefined) {
    direccion = direccion.replace(/\btil[\s-]til\b/gi, 'Tiltil');
    const sep = separarComuna(direccion);
    if (sep.comuna !== undefined) {
      direccion = sep.consulta;
      comuna ??= sep.comuna;
    }
  }
  comuna ??= comunaGoogle ?? referencia.comuna;
  if (comuna === undefined && direccion !== undefined) comuna = comunaEnTexto(direccion);
  if (comuna === undefined && nombres[0] !== undefined) {
    const sep = separarComuna(nombres[0]);
    if (sep.comuna !== undefined) {
      comuna = sep.comuna;
      nombres[0] = sep.consulta;
    }
  }

  // Pin: lo escrito en la lista; si cae fuera de la RM no se usa.
  let lat: number | undefined;
  let lng: number | undefined;
  if (punto) {
    const valido = leerCoordenadas(`${punto.lat}, ${punto.lng}`);
    if (valido) {
      lat = valido.lat;
      lng = valido.lng;
    } else motivos.push('El pin cae fuera de la Región Metropolitana.');
  }

  // Con pin alcanza: la comuna se estima por cercanía y la dirección es la ubicación en el mapa.
  let comunaEstimada = false;
  let sugerenciaComuna: readonly string[] = [];
  if (comuna === undefined && lat !== undefined && lng !== undefined) {
    const estimada = comunaDelPin(lat, lng);
    if (estimada.comuna !== undefined) {
      comuna = estimada.comuna;
      comunaEstimada = true;
    } else sugerenciaComuna = estimada.sugerencias;
  }
  let aproximada = false;
  if (direccion === undefined || direccion === '') {
    if (calleGoogle !== undefined) direccion = calleGoogle;
    else if (lat !== undefined && lng !== undefined) direccion = `Ubicación en el mapa (${lat}, ${lng})`;
    else if (referencia.referencia !== undefined) {
      direccion = referencia.referencia;
      aproximada = true;
    }
  }

  const razonSocialEscrita = nombres[0] !== undefined ? ordenarTexto(nombres[0]) : undefined;
  const razonSocial = razonSocialEscrita ?? tituloGoogle?.replace(/\s+/g, ' ').trim();
  const nombreDeGoogle = nombres[0] === undefined && tituloGoogle !== undefined;
  const otrosNombres = nombres.slice(1);

  if (cerradoPermanente) motivos.push('Google lo marca «cerrado permanentemente».');
  if (razonSocial === undefined) motivos.push('Falta el nombre del cliente.');
  if (direccion === undefined || direccion === '') motivos.push('Falta la dirección (solo hay un pin; el texto copiado no trae sus coordenadas).');
  if (comuna === undefined) motivos.push(sugerenciaComuna.length > 0 ? `No se pudo saber la comuna (el pin está entre ${sugerenciaComuna.join(' y ')}).` : 'No se pudo saber la comuna.');
  if (razonSocial !== undefined && RE_SOSPECHOSO.test(normalizar(razonSocial).replace(/ /g, ''))) motivos.push('El nombre parece texto de prueba.');

  const repetida = (a: string | undefined, b: string | undefined): boolean => a !== undefined && b !== undefined && (normalizar(a).includes(normalizar(b)) || normalizar(b).includes(normalizar(a)));
  const referenciaNota = referencia.referencia !== undefined && !aproximada && !repetida(direccion, referencia.referencia) ? `Cerca de ${referencia.referencia}` : undefined;
  const nota = unirNota([
    horarios.length > 0 ? `Horario: ${horarios.join('; ')}` : undefined,
    telefonos.length > 0 ? `Tel: ${telefonos.join('; ')}` : undefined,
    tituloGoogle !== undefined && !nombreDeGoogle ? `Nombre comercial: ${tituloGoogle.replace(/\s+/g, ' ').trim()}` : undefined,
    nombreDeGoogle ? 'Nombre tomado de Google' : undefined,
    otrosNombres.length > 0 ? `Obs: ${otrosNombres.join('; ')}` : undefined,
    otrasDirecciones.length > 0 ? `Otra dirección: ${otrasDirecciones.join('; ')}` : undefined,
    referenciaNota,
    yaNoExiste ? 'Google: «este lugar ya no existe»' : undefined,
    cerradoTemporal ? 'Google: cerrado temporalmente' : undefined,
  ]);

  const grave = motivos.filter((m) => !m.startsWith('Google lo marca'));
  const estado: EstadoEntrada = cerradoPermanente ? 'descartada' : grave.length > 0 ? 'revisar' : aproximada && lat === undefined ? 'aproximada' : 'lista';
  return {
    numero,
    crudo,
    origen,
    estado,
    motivos,
    ...(razonSocial !== undefined ? { razonSocial } : {}),
    ...(direccion !== undefined && direccion !== '' ? { direccion: direccion.startsWith('Ubicación en el mapa (') ? direccion : ordenarTexto(direccion) } : {}),
    ...(comuna !== undefined ? { comuna } : {}),
    ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
    ...(giro !== undefined ? { giro: ordenarTexto(giro) } : {}),
    ...(nota !== undefined ? { nota } : {}),
    ...(comunaEstimada ? { comunaEstimada } : {}),
  };
};

export const analizarListaMaps = (texto: string): { readonly entradas: readonly EntradaMapa[]; readonly resumen: ResumenLista } => {
  const entradas = separarEntradas(texto).map((l, i) => analizarEntrada(l, i + 1));
  const resumen = resumir(entradas);
  return { entradas, resumen };
};

/** Las filas que entran a la importación de clientes (la misma de la planilla). */
export const filasParaImportar = (entradas: readonly EntradaMapa[], incluirAproximadas: boolean): FilaClienteCruda[] =>
  entradas
    .filter((e) => e.estado === 'lista' || (incluirAproximadas && e.estado === 'aproximada'))
    .map((e) => ({
      ...(e.razonSocial !== undefined ? { razonSocial: e.razonSocial } : {}),
      ...(e.direccion !== undefined ? { direccion: e.direccion } : {}),
      ...(e.comuna !== undefined ? { comuna: e.comuna } : {}),
      ...(e.lat !== undefined && e.lng !== undefined ? { lat: String(e.lat), lng: String(e.lng) } : {}),
      ...(e.giro !== undefined ? { giro: e.giro } : {}),
      ...(e.nota !== undefined ? { nota: e.nota } : {}),
    }));

export type Correccion = { readonly razonSocial?: string; readonly direccion?: string; readonly comuna?: string };

/** Aplica lo que escribió la persona sobre una entrada y vuelve a decidir si ya está lista. Una descartada no se toca. */
export const completarEntrada = (e: EntradaMapa, c: Correccion): EntradaMapa => {
  if (e.estado === 'descartada') return e;
  const limpio = (t: string | undefined): string | undefined => {
    const v = t?.replace(/\s+/g, ' ').trim();
    return v === undefined || v === '' ? undefined : v;
  };
  const razonSocial = limpio(c.razonSocial) ?? e.razonSocial;
  const direccion = limpio(c.direccion) ?? e.direccion;
  const comuna = limpio(c.comuna) ?? e.comuna;
  const motivos: string[] = [];
  if (razonSocial === undefined) motivos.push('Falta el nombre del cliente.');
  if (direccion === undefined) motivos.push('Falta la dirección.');
  if (comuna === undefined || !COMUNAS_RM.includes(comuna)) motivos.push('Falta la comuna.');
  const estado: EstadoEntrada = motivos.length > 0 ? 'revisar' : e.estado === 'aproximada' && limpio(c.direccion) === undefined ? 'aproximada' : 'lista';
  return {
    numero: e.numero,
    crudo: e.crudo,
    origen: e.origen,
    ...(e.lat !== undefined && e.lng !== undefined ? { lat: e.lat, lng: e.lng } : {}),
    ...(e.giro !== undefined ? { giro: e.giro } : {}),
    ...(e.nota !== undefined ? { nota: e.nota } : {}),
    ...(e.comunaEstimada === true && limpio(c.comuna) === undefined ? { comunaEstimada: true } : {}),
    estado,
    motivos, ...(razonSocial !== undefined ? { razonSocial } : {}), ...(direccion !== undefined ? { direccion } : {}), ...(comuna !== undefined ? { comuna } : {}) };
};

export const resumir = (entradas: readonly EntradaMapa[]): ResumenLista => {
  const contar = (e: EstadoEntrada): number => entradas.filter((x) => x.estado === e).length;
  return {
    total: entradas.length,
    listas: contar('lista'),
    aproximadas: contar('aproximada'),
    revisar: contar('revisar'),
    descartadas: contar('descartada'),
    conPin: entradas.filter((e) => e.lat !== undefined).length,
    sinPinEnElTexto: entradas.filter((e) => e.estado !== 'descartada' && e.lat === undefined).length,
    comunaEstimada: entradas.filter((e) => e.comunaEstimada === true && e.estado !== 'descartada').length,
  };
};
