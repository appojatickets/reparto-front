import type { Geocodificador } from '../ports/geocodificador';
import type { Timer } from '../ports/timer';

export type PinSinComuna = { readonly numero: number; readonly lat: number; readonly lng: number };
export type ResultadoComunas = {
  /** Comuna encontrada por número de entrada. */
  readonly comunas: Readonly<Record<number, string>>;
  readonly sinRespuesta: number;
  /** Se cortó antes de terminar (límite del servicio o sin red); lo ya encontrado sirve. */
  readonly detenido: boolean;
};
export type ProgresoComunas = { readonly hechos: number; readonly total: number };

/**
 * Busca la comuna de cada pin, de a uno y con una pausa entre consultas: el servicio gratuito de OpenStreetMap acepta una por
 * segundo. Los pines repetidos (mismo punto) se consultan una sola vez.
 */
export const crearCompletarComunas = ({ geocodificador, timer }: { geocodificador: Geocodificador; timer: Timer }) =>
  async (pines: readonly PinSinComuna[], alAvanzar?: (p: ProgresoComunas) => void, pausaMs = 1100): Promise<ResultadoComunas> => {
    const pausa = (): Promise<void> => new Promise((resolver) => { timer.after(pausaMs, resolver); });
    const comunas: Record<number, string> = {};
    const porPunto = new Map<string, string | undefined>();
    let sinRespuesta = 0;
    let consultas = 0;
    for (const [i, p] of pines.entries()) {
      const clave = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
      if (!porPunto.has(clave)) {
        if (consultas > 0) await pausa();
        consultas++;
        const r = await geocodificador.comunaDe(p.lat, p.lng);
        if (!r.ok && r.error !== 'SIN_RESULTADO') return { comunas, sinRespuesta: sinRespuesta + (pines.length - i), detenido: true };
        porPunto.set(clave, r.ok ? r.value : undefined);
      }
      const comuna = porPunto.get(clave);
      if (comuna === undefined) sinRespuesta++;
      else comunas[p.numero] = comuna;
      alAvanzar?.({ hechos: i + 1, total: pines.length });
    }
    return { comunas, sinRespuesta, detenido: false };
  };
