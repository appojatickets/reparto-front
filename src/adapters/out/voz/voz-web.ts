import type { ErrorVoz, Voz } from '../../../application/ports/voz';

/** Lo mínimo de la API de reconocimiento de voz (no viene en los tipos estándar de TypeScript). */
type Reconocimiento = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type Constructor = new () => Reconocimiento;
type VentanaConVoz = { SpeechRecognition?: Constructor; webkitSpeechRecognition?: Constructor };

const aErrorVoz = (codigo: string): ErrorVoz => {
  switch (codigo) {
    case 'not-allowed':
    case 'service-not-allowed':
    case 'audio-capture':
      return 'PERMISO';
    case 'no-speech':
      return 'SIN_VOZ';
    case 'network':
      return 'RED';
    default:
      return 'OTRO';
  }
};

export const crearVozWeb = (ventana: VentanaConVoz = window as unknown as VentanaConVoz): Voz => {
  const Reconocedor = ventana.SpeechRecognition ?? ventana.webkitSpeechRecognition;
  return {
    disponible: Reconocedor !== undefined,
    escuchar({ alTexto, alTerminar }) {
      if (!Reconocedor) {
        alTerminar('OTRO');
        return { detener: () => undefined };
      }
      const r = new Reconocedor();
      r.lang = 'es-CL';
      r.continuous = false;
      r.interimResults = true;
      r.maxAlternatives = 1;
      let error: ErrorVoz | undefined;
      let terminada = false;
      const terminar = (fallo?: ErrorVoz): void => {
        if (terminada) return;
        terminada = true;
        r.onresult = null;
        r.onerror = null;
        r.onend = null;
        alTerminar(fallo);
      };
      r.onresult = (e) => {
        let texto = '';
        let final = true;
        for (let i = 0; i < e.results.length; i++) {
          const resultado = e.results[i];
          texto += resultado?.[0]?.transcript ?? '';
          final = final && resultado?.isFinal === true;
        }
        alTexto({ texto: texto.trim(), final });
      };
      r.onerror = (e) => {
        error = aErrorVoz(e.error);
        terminar(error);
      };
      r.onend = () => {
        terminar(error);
      };
      try {
        r.start();
      } catch {
        terminar('OTRO');
      }
      return { detener: () => {
        if (terminada) return;
        try { r.stop(); } catch { terminar(); }
      } };
    },
  };
};
