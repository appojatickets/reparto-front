import type { ErrorVoz, Voz } from '../../../application/ports/voz';
export interface DictadoAndroid {
  dictar(): Promise<{ texto?: string; cancelado?: boolean }>;
}
/** El diálogo del sistema funciona también en WebView, donde Web Speech no está disponible. */
export const crearVozAndroid = (bridge: DictadoAndroid): Voz => ({
  disponible: true,
  escuchar({ alTexto, alTerminar }) {
    let terminada = false;
    const terminar = (error?: ErrorVoz): void => {
      if (terminada) return;
      terminada = true;
      alTerminar(error);
    };
    void bridge.dictar().then(r => {
      if (terminada) return;
      if (r.cancelado) { terminar(); return; }
      const texto = r.texto?.trim();
      if (texto) { alTexto({ texto, final: true }); terminar(); }
      else terminar('SIN_VOZ');
    }).catch((e: unknown) => {
      const codigo = typeof e === 'object' && e !== null && 'code' in e ? e.code : undefined;
      terminar(codigo === 'PERMISO' ? 'PERMISO' : 'OTRO');
    });
    // El diálogo nativo ofrece su propio botón para cancelar.
    return { detener: () => { terminar(); } };
  },
});
