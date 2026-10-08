import { enlaceVerEnMapa } from './enlaces';

/** 77975918-0 → 77.975.918-0; si no tiene la forma de un RUT, queda como vino. */
export const formatoRut = (rut: string): string => {
  const m = /^(\d{1,8})-([\dkK])$/.exec(rut.trim());
  if (!m) return rut;
  return `${(m[1] ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${m[2] ?? ''}`;
};

/** «3 entregas hechas». */
export const lineaEntregas = (entregas: number): string => `${entregas} ${entregas === 1 ? 'entrega hecha' : 'entregas hechas'}`;

export type LocalParaCompartir = {
  readonly razonSocial: string;
  readonly rut?: string | undefined;
  readonly direccion: string;
  readonly comuna: string;
  readonly lat?: number | undefined;
  readonly lng?: number | undefined;
  readonly entregas?: number | undefined;
};

/** El mensaje que se manda por WhatsApp o se copia: nombre, RUT, dirección, enlace al pin y, si hay, lo entregado. */
export const textoParaCompartir = (l: LocalParaCompartir): string => {
  const lineas = [l.razonSocial];
  if (l.rut) lineas.push(`RUT ${formatoRut(l.rut)}`);
  lineas.push(`${l.direccion}, ${l.comuna}`);
  lineas.push(l.lat !== undefined && l.lng !== undefined ? `Ubicación: ${enlaceVerEnMapa(l.lat, l.lng)}` : 'Ubicación: sin pin todavía');
  if (l.entregas !== undefined && l.entregas > 0) lineas.push(lineaEntregas(l.entregas));
  return lineas.join('\n');
};
