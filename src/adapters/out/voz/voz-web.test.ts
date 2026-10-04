import { describe, expect, it, vi } from 'vitest';
import { crearVozWeb } from './voz-web';

class FalsoReconocedor {
  static ultimo: FalsoReconocedor | undefined;
  lang = '';
  continuous = true;
  interimResults = false;
  maxAlternatives = 0;
  onresult: ((e: never) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => { this.onend?.(); });
  abort = vi.fn();
  constructor() { FalsoReconocedor.ultimo = this; }
}
const resultados = (...partes: { t: string; final: boolean }[]) => ({ results: partes.map((p) => Object.assign([{ transcript: p.t }], { isFinal: p.final })) });

describe('voz del navegador', () => {
  it('sin API de reconocimiento no está disponible y avisa al intentar', () => {
    const voz = crearVozWeb({});
    expect(voz.disponible).toBe(false);
    const alTerminar = vi.fn();
    voz.escuchar({ alTexto: vi.fn(), alTerminar });
    expect(alTerminar).toHaveBeenCalledWith('OTRO');
  });

  it('configura español de Chile, resultados parciales y entrega el texto armado', () => {
    const voz = crearVozWeb({ webkitSpeechRecognition: FalsoReconocedor as never });
    expect(voz.disponible).toBe(true);
    const alTexto = vi.fn();
    voz.escuchar({ alTexto, alTerminar: vi.fn() });
    const r = FalsoReconocedor.ultimo;
    expect(r).toMatchObject({ lang: 'es-CL', continuous: false, interimResults: true });
    expect(r?.start).toHaveBeenCalled();
    (r?.onresult as (e: unknown) => void)(resultados({ t: 'mil doscientos ', final: false }));
    (r?.onresult as (e: unknown) => void)(resultados({ t: 'mil doscientos treinta y cuatro ', final: false }, { t: 'rabet', final: true }));
    expect(alTexto).toHaveBeenNthCalledWith(1, { texto: 'mil doscientos', final: false });
    expect(alTexto).toHaveBeenNthCalledWith(2, { texto: 'mil doscientos treinta y cuatro rabet', final: true });
  });

  it('traduce los errores y avisa al terminar; detener corta la escucha', () => {
    const voz = crearVozWeb({ SpeechRecognition: FalsoReconocedor as never });
    const alTerminar = vi.fn();
    const sesion = voz.escuchar({ alTexto: vi.fn(), alTerminar });
    FalsoReconocedor.ultimo?.onerror?.({ error: 'not-allowed' });
    sesion.detener();
    expect(alTerminar).toHaveBeenCalledWith('PERMISO');

    for (const [codigo, esperado] of [['no-speech', 'SIN_VOZ'], ['network', 'RED'], ['audio-capture', 'PERMISO'], ['raro', 'OTRO']] as const) {
      const f = vi.fn();
      voz.escuchar({ alTexto: vi.fn(), alTerminar: f });
      FalsoReconocedor.ultimo?.onerror?.({ error: codigo });
      FalsoReconocedor.ultimo?.onend?.();
      expect(f).toHaveBeenCalledWith(esperado);
    }
  });

  it('terminar sin error no informa error', () => {
    const voz = crearVozWeb({ SpeechRecognition: FalsoReconocedor as never });
    const alTerminar = vi.fn();
    voz.escuchar({ alTexto: vi.fn(), alTerminar });
    FalsoReconocedor.ultimo?.onend?.();
    expect(alTerminar).toHaveBeenCalledWith(undefined);
  });
});
