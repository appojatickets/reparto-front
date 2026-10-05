/** Un local con los datos de su cliente, tal como llega de la API para exportar. */
export type FilaExportacion = {
  readonly localId: string;
  readonly clienteId: string;
  readonly razonSocial: string;
  readonly rut?: string;
  readonly giro?: string;
  readonly estadoCliente: 'nuevo' | 'activo' | 'inactivo' | 'cerrado' | 'archivado';
  readonly direccion: string;
  readonly comuna: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly pinEstado: 'pendiente' | 'sugerido' | 'validado';
  readonly pinFuente?: 'geocodificador' | 'manual' | 'importado' | 'aprendido' | 'chofer' | 'enlace';
  readonly pinConfianza?: number;
  readonly nota?: string;
  readonly tieneFoto: boolean;
  readonly creadoEn: string;
};

/** Las columnas que se pueden llevar en una exportación: quien exporta elige cuáles y en qué orden salen (el del catálogo). */
export type IdColumna =
  | 'razonSocial' | 'rut' | 'giro' | 'direccion' | 'comuna' | 'lat' | 'lng' | 'enlaceMapa'
  | 'estadoPin' | 'fuentePin' | 'confianzaPin' | 'nota' | 'foto' | 'estadoCliente' | 'creado' | 'idLocal' | 'idCliente';

type Valor = string | number | undefined;
export type Columna = { readonly id: IdColumna; readonly titulo: string; readonly valor: (f: FilaExportacion) => Valor };

const ESTADO_PIN: Readonly<Record<FilaExportacion['pinEstado'], string>> = { pendiente: 'Sin pin', sugerido: 'Sugerido', validado: 'Validado' };
const FUENTE_PIN: Readonly<Record<NonNullable<FilaExportacion['pinFuente']>, string>> = {
  geocodificador: 'Buscador por dirección', manual: 'Manual', importado: 'Importado', aprendido: 'Aprendido', chofer: 'GPS del chofer', enlace: 'Enlace del vendedor',
};

export const COLUMNAS: readonly Columna[] = [
  { id: 'razonSocial', titulo: 'Razón social', valor: (f) => f.razonSocial },
  { id: 'rut', titulo: 'RUT', valor: (f) => f.rut },
  { id: 'giro', titulo: 'Giro', valor: (f) => f.giro },
  { id: 'direccion', titulo: 'Dirección', valor: (f) => f.direccion },
  { id: 'comuna', titulo: 'Comuna', valor: (f) => f.comuna },
  { id: 'lat', titulo: 'Latitud', valor: (f) => f.lat },
  { id: 'lng', titulo: 'Longitud', valor: (f) => f.lng },
  { id: 'enlaceMapa', titulo: 'Enlace de Google Maps', valor: (f) => (f.lat !== undefined && f.lng !== undefined ? `https://www.google.com/maps?q=${f.lat},${f.lng}` : undefined) },
  { id: 'estadoPin', titulo: 'Estado del pin', valor: (f) => ESTADO_PIN[f.pinEstado] },
  { id: 'fuentePin', titulo: 'Fuente del pin', valor: (f) => (f.pinFuente ? FUENTE_PIN[f.pinFuente] : undefined) },
  { id: 'confianzaPin', titulo: 'Confianza del pin', valor: (f) => f.pinConfianza },
  { id: 'nota', titulo: 'Nota', valor: (f) => f.nota },
  { id: 'foto', titulo: 'Foto de la fachada', valor: (f) => (f.tieneFoto ? 'Sí' : 'No') },
  { id: 'estadoCliente', titulo: 'Estado del cliente', valor: (f) => f.estadoCliente },
  { id: 'creado', titulo: 'Creado el', valor: (f) => f.creadoEn.slice(0, 10) },
  { id: 'idLocal', titulo: 'ID del local', valor: (f) => f.localId },
  { id: 'idCliente', titulo: 'ID del cliente', valor: (f) => f.clienteId },
];

export const COLUMNAS_POR_DEFECTO: readonly IdColumna[] = ['razonSocial', 'rut', 'direccion', 'comuna', 'lat', 'lng'];

/** excel: punto y coma y decimales con coma (como lo espera un Excel en español) · estandar: coma y punto decimal. */
export type FormatoCsv = 'excel' | 'estandar';

/** Una celda que empieza con = + - @ la tomaría Excel por una fórmula: se le antepone una comilla (los números no se tocan). */
const textoSeguro = (t: string): string => (/^[=+\-@\t\r]/.test(t) ? `'${t}` : t);

const celda = (v: Valor, formato: FormatoCsv, separador: string): string => {
  if (v === undefined) return '';
  const texto = typeof v === 'number' ? (formato === 'excel' ? String(v).replace('.', ',') : String(v)) : textoSeguro(v);
  return texto.includes(separador) || /["\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

/** El CSV listo para guardar: con BOM (Excel lee bien las tildes), líneas CRLF y solo las columnas elegidas, en el orden del catálogo. */
export const aCsv = (filas: readonly FilaExportacion[], ids: readonly IdColumna[], formato: FormatoCsv): string => {
  const columnas = COLUMNAS.filter((c) => ids.includes(c.id));
  const separador = formato === 'excel' ? ';' : ',';
  const lineas = [
    columnas.map((c) => celda(c.titulo, formato, separador)).join(separador),
    ...filas.map((f) => columnas.map((c) => celda(c.valor(f), formato, separador)).join(separador)),
  ];
  return `\uFEFF${lineas.join('\r\n')}\r\n`;
};

export type ResumenExportacion = { readonly total: number; readonly conPin: number; readonly sinPin: number; readonly conFoto: number; readonly sinFoto: number };

/** Cuántos de los locales tienen pin y foto: para ver qué tanto falta por juntar antes de exportar. */
export const resumir = (filas: readonly FilaExportacion[]): ResumenExportacion => {
  const conPin = filas.filter((f) => f.lat !== undefined && f.lng !== undefined).length;
  const conFoto = filas.filter((f) => f.tieneFoto).length;
  return { total: filas.length, conPin, sinPin: filas.length - conPin, conFoto, sinFoto: filas.length - conFoto };
};

export const nombreDeArchivo = (hoy: string): string => `clientes-${hoy}.csv`;
