import { describe, expect, it } from 'vitest';
import { aCsv, COLUMNAS, COLUMNAS_POR_DEFECTO, nombreDeArchivo, resumir, type FilaExportacion } from './exportacion';

/** Una fila sin las claves indicadas (con exactOptionalPropertyTypes no se pueden dejar en undefined). */
const sin = (f: FilaExportacion, ...claves: readonly (keyof FilaExportacion)[]): FilaExportacion =>
  Object.fromEntries(Object.entries(f).filter(([k]) => !claves.includes(k as keyof FilaExportacion))) as unknown as FilaExportacion;

const fila = (extra: Partial<FilaExportacion> = {}): FilaExportacion => ({
  localId: 'l1', clienteId: 'c1', razonSocial: 'Rabelo Mágica SpA', rut: '77975918-0', estadoCliente: 'activo', direccion: 'Av. Colón Sur 765', comuna: 'San Bernardo',
  lat: -33.6012, lng: -70.7021, pinEstado: 'validado', pinFuente: 'enlace', tieneFoto: true, creadoEn: '2026-10-05T12:00:00.000Z', ...extra,
});

describe('exportar a CSV', () => {
  it('con las columnas por defecto: BOM, títulos, punto y coma y decimales con coma (Excel en español)', () => {
    const csv = aCsv([fila()], COLUMNAS_POR_DEFECTO, 'excel');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.split('\r\n')).toEqual(['\uFEFFRazón social;RUT;Dirección;Comuna;Latitud;Longitud', 'Rabelo Mágica SpA;77975918-0;Av. Colón Sur 765;San Bernardo;-33,6012;-70,7021', '']);
  });

  it('formato estándar: coma y punto decimal; las celdas con coma o comillas se entrecomillan', () => {
    const csv = aCsv([fila({ razonSocial: 'Kiosko "El Sol", Maipú', direccion: 'Calle 1, 100' })], ['razonSocial', 'direccion', 'lat'], 'estandar');
    expect(csv.split('\r\n')[1]).toBe('"Kiosko ""El Sol"", Maipú","Calle 1, 100",-33.6012');
  });

  it('las columnas salen en el orden del catálogo, no en el que se marcaron, y se pueden elegir todas', () => {
    const csv = aCsv([fila()], ['comuna', 'razonSocial'], 'excel');
    expect(csv.split('\r\n')[0]).toBe('\uFEFFRazón social;Comuna');
    const todas = aCsv([fila()], COLUMNAS.map((c) => c.id), 'excel').split('\r\n');
    expect(todas[0]?.split(';')).toHaveLength(COLUMNAS.length);
    expect(todas[1]).toContain('https://www.google.com/maps?q=-33.6012,-70.7021');
    expect(todas[1]).toContain('Enlace del vendedor');
    expect(todas[1]).toContain('2026-10-05');
  });

  it('lo que falta queda en blanco y la foto dice Sí o No', () => {
    const csv = aCsv([{ ...sin(fila(), 'rut', 'lat', 'lng', 'pinFuente'), tieneFoto: false, pinEstado: 'pendiente' as const }], ['rut', 'lat', 'estadoPin', 'fuentePin', 'foto'], 'excel');
    expect(csv.split('\r\n')[1]).toBe(';;Sin pin;;No');
  });

  it('un texto que empieza con = + - @ no se deja como fórmula de Excel', () => {
    const csv = aCsv([fila({ razonSocial: '=HIPERVINCULO("http://x")', nota: '+56 9 1234 5678' })], ['razonSocial', 'nota'], 'excel');
    expect(csv.split('\r\n')[1]).toBe('"\'=HIPERVINCULO(""http://x"")";\'+56 9 1234 5678');
  });

  it('el nombre del archivo lleva la fecha', () => {
    expect(nombreDeArchivo('2026-10-05')).toBe('clientes-2026-10-05.csv');
  });
});

describe('resumen de lo exportado', () => {
  it('cuenta cuántos tienen pin y foto', () => {
    const filas = [fila(), { ...sin(fila(), 'lat', 'lng'), localId: 'l2', tieneFoto: false }, fila({ localId: 'l3', tieneFoto: false })];
    expect(resumir(filas)).toEqual({ total: 3, conPin: 2, sinPin: 1, conFoto: 1, sinFoto: 2 });
    expect(resumir([])).toEqual({ total: 0, conPin: 0, sinPin: 0, conFoto: 0, sinFoto: 0 });
  });
});
