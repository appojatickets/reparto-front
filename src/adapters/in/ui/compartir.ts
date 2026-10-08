/** Compartir un local con el menú del teléfono (WhatsApp, correo…); con foto si el teléfono deja compartir archivos. */
export const puedeCompartirNativo = (): boolean => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

export type ResultadoCompartir = 'compartido' | 'cancelado' | 'fallo';

const fotoComoArchivo = async (url: string): Promise<File | undefined> => {
  try {
    const r = await fetch(url);
    if (!r.ok) return undefined;
    const blob = await r.blob();
    return new File([blob], 'fachada.jpg', { type: blob.type || 'image/jpeg' });
  } catch {
    return undefined;
  }
};

export const compartirNativo = async (titulo: string, texto: string, urlFoto?: string): Promise<ResultadoCompartir> => {
  try {
    const foto = urlFoto !== undefined && typeof navigator.canShare === 'function' ? await fotoComoArchivo(urlFoto) : undefined;
    if (foto && navigator.canShare({ files: [foto] })) await navigator.share({ title: titulo, text: texto, files: [foto] });
    else await navigator.share({ title: titulo, text: texto });
    return 'compartido';
  } catch (e) {
    return e instanceof DOMException && e.name === 'AbortError' ? 'cancelado' : 'fallo';
  }
};

export const copiarTexto = async (texto: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
};
