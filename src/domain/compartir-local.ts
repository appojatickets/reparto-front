import { enlaceVerEnMapa } from './enlaces';

/** Pesos chilenos con punto de miles: $1.234.567. */
export const formatoPesos = (n: number): string => `$${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

/** 77975918-0 → 77.975.918-0; si no tiene la forma de un RUT, queda como vino. */
export const formatoRut = (rut: string): string => {
  const m = /^(\d{1,8})-([\dkK])$/.exec(rut.trim());
  if (!m) return rut;
  return `${(m[1] ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${m[2] ?? ''}`;
};

/** «Entregado: $450.000 en 3 facturas». */
export const lineaEntregado = (entregas: number, recaudado: number): string => `Entregado: ${formatoPesos(recaudado)} en ${entregas} ${entregas === 1 ? 'factura' : 'facturas'}`;

export type LocalParaCompartir = {
  readonly razonSocial: string;
  readonly rut?: string | undefined;
  readonly direccion: string;
  readonly comuna: string;
  readonly lat?: number | undefined;
  readonly lng?: number | undefined;
  readonly entregas?: number | undefined;
  readonly recaudado?: number | undefined;
};

/** El mensaje que se manda por WhatsApp o se copia: nombre, RUT, dirección, enlace al pin y, si hay, lo entregado. */
export const textoParaCompartir = (l: LocalParaCompartir): string => {
  const lineas = [l.razonSocial];
  if (l.rut) lineas.push(`RUT ${formatoRut(l.rut)}`);
  lineas.push(`${l.direccion}, ${l.comuna}`);
  lineas.push(l.lat !== undefined && l.lng !== undefined ? `Ubicación: ${enlaceVerEnMapa(l.lat, l.lng)}` : 'Ubicación: sin pin todavía');
  if (l.entregas !== undefined && l.entregas > 0) lineas.push(lineaEntregado(l.entregas, l.recaudado ?? 0));
  return lineas.join('\n');
};
