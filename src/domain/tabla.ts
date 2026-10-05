import { comunaDelPin } from './comunas';

export type Tabla = { readonly encabezados: readonly string[]; readonly filas: readonly (readonly string[])[] };

const DELIMITADORES = ['\t', ';', ','] as const;

const elegirDelimitador = (primeraLinea: string): string => {
  let mejor: string = ',';
  let max = 0;
  for (const d of DELIMITADORES) {
    const n = primeraLinea.split(d).length - 1;
    if (n > max) {
      max = n;
      mejor = d;
    }
  }
  return mejor;
};

/** Lee CSV/TSV (también pegado desde Excel). Respeta comillas, comillas dobles escapadas y saltos de línea en un campo. */
export const parsearTabla = (texto: string): Tabla => {
  const limpio = texto.replace(/^\uFEFF/, '');
  const primera = limpio.split(/\r?\n/).find((l) => l.trim() !== '') ?? '';
  const delimitador = elegirDelimitador(primera);

  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let entreComillas = false;
  const cerrarCampo = (): void => {
    fila.push(campo.trim());
    campo = '';
  };
  const cerrarFila = (): void => {
    cerrarCampo();
    if (fila.some((c) => c !== '')) filas.push(fila);
    fila = [];
  };

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio.charAt(i);
    if (entreComillas) {
      if (c === '"' && limpio.charAt(i + 1) === '"') {
        campo += '"';
        i++;
      } else if (c === '"') entreComillas = false;
      else campo += c;
    } else if (c === '"') entreComillas = true;
    else if (c === delimitador) cerrarCampo();
    else if (c === '\n') cerrarFila();
    else if (c !== '\r') campo += c;
  }
  cerrarFila();

  const [encabezados = [], ...datos] = filas;
  return { encabezados, filas: datos.map((f) => Array.from({ length: encabezados.length }, (_, i) => f[i] ?? '')) };
};

export type CampoCliente = 'rut' | 'razonSocial' | 'giro' | 'direccion' | 'comuna' | 'lat' | 'lng' | 'nota' | 'enlace';
export type FilaClienteCruda = Partial<Record<CampoCliente, string>>;

const SINONIMOS: Readonly<Record<CampoCliente, readonly string[]>> = {
  rut: ['rut', 'rutcliente', 'run'],
  razonSocial: ['razonsocial', 'razon', 'nombre', 'nombrecliente', 'cliente'],
  giro: ['giro', 'rubro'],
  direccion: ['direccion', 'domicilio', 'calle', 'direccioncliente'],
  comuna: ['comuna'],
  lat: ['lat', 'latitud', 'latitude'],
  lng: ['lng', 'lon', 'long', 'longitud', 'longitude'],
  nota: ['nota', 'notas', 'observacion', 'observaciones', 'comentario', 'comentarios'],
  enlace: ['enlace', 'enlacegoogle', 'enlacegooglemaps', 'enlacemapa', 'url', 'urlgoogle', 'link', 'linkgoogle', 'googlemaps'],
};
const OBLIGATORIOS: readonly CampoCliente[] = ['razonSocial', 'direccion', 'comuna'];

const clave = (t: string): string =>
  t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export type MapeoClientes = {
  readonly filas: readonly FilaClienteCruda[];
  readonly ignoradas: readonly string[];
  readonly faltantes: readonly CampoCliente[];
};

/** Asocia cada columna de la planilla a un campo del cliente. Si dos columnas apuntan al mismo campo, gana la primera. */
export const mapearClientes = (tabla: Tabla): MapeoClientes => {
  const campoPorColumna = new Map<number, CampoCliente>();
  const ocupados = new Set<CampoCliente>();
  const ignoradas: string[] = [];

  tabla.encabezados.forEach((nombre, i) => {
    const k = clave(nombre);
    const campo = (Object.keys(SINONIMOS) as CampoCliente[]).find((c) => SINONIMOS[c].includes(k));
    if (campo && !ocupados.has(campo)) {
      campoPorColumna.set(i, campo);
      ocupados.add(campo);
    } else ignoradas.push(nombre);
  });

  const filas = tabla.filas.map((f) => {
    const salida: FilaClienteCruda = {};
    campoPorColumna.forEach((campo, i) => {
      const v = f[i];
      if (v !== undefined && v !== '') salida[campo] = v;
    });
    return salida;
  });
  return { filas, ignoradas, faltantes: OBLIGATORIOS.filter((c) => !ocupados.has(c)) };
};

export type PinCrudo = { readonly rut?: string; readonly direccion?: string; readonly lat?: string; readonly lng?: string };
export type MapeoPines = { readonly pines: readonly PinCrudo[]; readonly ignoradas: readonly string[]; readonly faltantes: readonly ('direccion' | 'lat' | 'lng')[] };

const SINONIMOS_PIN: Readonly<Record<keyof PinCrudo, readonly string[]>> = {
  rut: SINONIMOS.rut,
  direccion: SINONIMOS.direccion,
  lat: SINONIMOS.lat,
  lng: SINONIMOS.lng,
};

/** Planilla de pines (p. ej. la que arman los choferes): RUT (opcional), dirección, latitud y longitud. */
export const mapearPines = (tabla: Tabla): MapeoPines => {
  const campoPorColumna = new Map<number, keyof PinCrudo>();
  const ocupados = new Set<keyof PinCrudo>();
  const ignoradas: string[] = [];
  tabla.encabezados.forEach((nombre, i) => {
    const k = clave(nombre);
    const campo = (Object.keys(SINONIMOS_PIN) as (keyof PinCrudo)[]).find((c) => SINONIMOS_PIN[c].includes(k));
    if (campo && !ocupados.has(campo)) {
      campoPorColumna.set(i, campo);
      ocupados.add(campo);
    } else ignoradas.push(nombre);
  });
  const pines = tabla.filas.map((f) => {
    const salida: { -readonly [K in keyof PinCrudo]?: string } = {};
    campoPorColumna.forEach((campo, i) => {
      const v = f[i];
      if (v !== undefined && v !== '') salida[campo] = v;
    });
    return salida;
  });
  const obligatorios = ['direccion', 'lat', 'lng'] as const;
  return { pines, ignoradas, faltantes: obligatorios.filter((c) => !ocupados.has(c)) };
};

const numero = (t: string | undefined): number | undefined => {
  if (t === undefined) return undefined;
  const n = Number(t.trim().replace(',', '.'));
  return t.trim() !== '' && Number.isFinite(n) ? n : undefined;
};

/**
 * Las filas que solo traen el pin (sin dirección o sin comuna) entran igual: la dirección queda como «Ubicación en el mapa (lat, lng)»
 * y la comuna se calcula por la cercanía del pin (la misma regla de la lista de Google Maps). `completadas` cuenta las que se arreglaron así.
 */
export const completarConPin = (filas: readonly FilaClienteCruda[]): { readonly filas: readonly FilaClienteCruda[]; readonly completadas: number } => {
  let completadas = 0;
  const salida = filas.map((f) => {
    if (f.direccion !== undefined && f.comuna !== undefined) return f;
    const lat = numero(f.lat);
    const lng = numero(f.lng);
    if (lat === undefined || lng === undefined) return f;
    const comuna = f.comuna ?? comunaDelPin(lat, lng).sugerencias[0];
    if (comuna === undefined) return f;
    completadas++;
    return { ...f, direccion: f.direccion ?? `Ubicación en el mapa (${lat}, ${lng})`, comuna };
  });
  return { filas: salida, completadas };
};

/** La fila tal como la recibe la API: el enlace de Google Maps no es un dato del cliente, lo lee la app para fijar el pin. */
export const sinEnlace = (f: FilaClienteCruda): FilaClienteCruda => Object.fromEntries(Object.entries(f).filter(([k]) => k !== 'enlace'));
