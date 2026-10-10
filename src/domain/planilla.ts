import { clave, parsearTabla } from './tabla';

/** Una fila de la planilla, lista para enviar. */
export type FilaPlanillaEnviada = {
  readonly patente: string;
  readonly chofer?: string;
  readonly ayudante?: string;
  readonly vendedores?: readonly { readonly codigo: string; readonly nombre?: string }[];
  readonly comunas?: readonly string[];
};

export type VendedorDeCelda = { readonly codigo: string; readonly nombre?: string };

/** V6, V06 y «v 06» son el mismo vendedor → V06 (igual que en la API). */
const codigoDe = (texto: string): string | undefined => {
  const m = /^V\s*0*(\d{1,3})$/i.exec(texto.trim());
  return m ? `V${(m[1] ?? '').padStart(2, '0')}` : undefined;
};

/**
 * Lee la celda de vendedores de la planilla: «V12 Mario Quiroz - V13 Oscar baeza» o solo «V14». Se separa en cada código V + número,
 * así los guiones y las comas son opcionales.
 */
export const leerCeldaVendedores = (celda: string): readonly VendedorDeCelda[] => {
  const texto = celda.replace(/\s+/g, ' ').trim();
  if (texto === '' || texto === '-') return [];
  const partes = texto.split(/(?=\bV\s*\d{1,3}\b)/i).map((p) => p.trim()).filter((p) => p !== '');
  const vendedores: VendedorDeCelda[] = [];
  for (const parte of partes) {
    const m = /^(V\s*\d{1,3})\b[\s:.-]*(.*)$/i.exec(parte);
    const codigo = m ? codigoDe(m[1] ?? '') : undefined;
    if (!m || codigo === undefined) continue;
    const nombre = (m[2] ?? '').replace(/[\s,;/-]+$/u, '').trim();
    vendedores.push({ codigo, ...(nombre !== '' ? { nombre } : {}) });
  }
  return vendedores;
};

/** «Maipú, Pudahuel», «La Florida y Puente Alto» o «Maipú / Lampa» → las comunas, sin repetir. */
export const leerComunas = (celda: string): readonly string[] => {
  const comunas: string[] = [];
  for (const t of celda.split(/[,;/]|\s+y\s+/i)) {
    const comuna = t.trim();
    if (comuna === '' || comuna === '-') continue;
    if (!comunas.some((c) => clave(c) === clave(comuna))) comunas.push(comuna);
  }
  return comunas;
};

type Columna = 'chofer' | 'ayudante' | 'camion' | 'vendedor' | 'comuna';
const SINONIMOS: Readonly<Record<Columna, readonly string[]>> = {
  chofer: ['chofer', 'choferes', 'conductor'],
  ayudante: ['ayudante', 'ayudantes', 'peoneta'],
  camion: ['camion', 'patente', 'vehiculo', 'movil', 'camionpatente', 'patentecamion'],
  vendedor: ['vendedor', 'vendedores', 'vend'],
  comuna: ['comuna', 'comunas', 'zona'],
};

export type PlanillaLeida = {
  readonly filas: readonly FilaPlanillaEnviada[];
  /** Columnas obligatorias que no se encontraron (hoy solo el camión). */
  readonly faltantes: readonly 'camion'[];
  /** Encabezados que no se usan. */
  readonly ignoradas: readonly string[];
};

const limpio = (t: string | undefined): string | undefined => {
  const l = t?.replace(/\s+/g, ' ').trim();
  return l === undefined || l === '' || l === '-' ? undefined : l;
};

/** «ab 12-34», «LZYS·23» → AB1234, LZYS23. */
const patenteDe = (t: string): string => t.replace(/[\s.\-·]/g, '').toUpperCase();

/** Lee la planilla de la mañana pegada desde Excel (encabezados en la primera fila, columnas en cualquier orden). */
export const leerPlanilla = (texto: string): PlanillaLeida => {
  const tabla = parsearTabla(texto);
  const columna = new Map<Columna, number>();
  const ignoradas: string[] = [];
  tabla.encabezados.forEach((nombre, i) => {
    const k = clave(nombre);
    const c = (Object.keys(SINONIMOS) as Columna[]).find((x) => SINONIMOS[x].includes(k));
    if (c && !columna.has(c)) columna.set(c, i);
    else if (k !== '') ignoradas.push(nombre);
  });
  const iCamion = columna.get('camion');
  if (iCamion === undefined) return { filas: [], faltantes: tabla.encabezados.length === 0 ? [] : ['camion'], ignoradas };

  const celda = (f: readonly string[], c: Columna): string | undefined => {
    const i = columna.get(c);
    return i === undefined ? undefined : f[i];
  };
  const filas: FilaPlanillaEnviada[] = [];
  for (const f of tabla.filas) {
    const patente = patenteDe(f[iCamion] ?? '');
    if (patente === '') continue;
    const chofer = limpio(celda(f, 'chofer'));
    const ayudante = limpio(celda(f, 'ayudante'));
    const vendedores = columna.has('vendedor') ? leerCeldaVendedores(celda(f, 'vendedor') ?? '') : undefined;
    const comunas = leerComunas(celda(f, 'comuna') ?? '');
    filas.push({
      patente,
      ...(chofer !== undefined ? { chofer } : {}),
      ...(ayudante !== undefined ? { ayudante } : {}),
      ...(vendedores !== undefined ? { vendedores } : {}),
      ...(comunas.length > 0 ? { comunas } : {}),
    });
  }
  return { filas, faltantes: [], ignoradas };
};
