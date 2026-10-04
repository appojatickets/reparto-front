import { err, ok } from '../../../domain/result';
import type { Imagenes } from '../../../application/ports/imagenes';

const LADO_MAXIMO = 1280;
const OBJETIVO_BYTES = 120 * 1024;

const aBlob = (canvas: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob | null> =>
  new Promise((resolve) => {
    canvas.toBlob(resolve, tipo, calidad);
  });

/** Foto de fachada → WebP (o JPEG si el navegador no sabe codificar WebP) de ~120 KB, máximo 1280 px por lado. */
export const imagenesCanvas: Imagenes = {
  async comprimir(archivo) {
    try {
      const bitmap = await createImageBitmap(archivo);
      const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * escala);
      canvas.height = Math.round(bitmap.height * escala);
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();

      const probar = async (mime: 'image/webp' | 'image/jpeg') => {
        let mejor: Blob | null = null;
        for (const calidad of [0.8, 0.7, 0.6, 0.5, 0.4]) {
          const b = await aBlob(canvas, mime, calidad);
          if (b?.type !== mime) return null; // el navegador no soporta este formato
          mejor = b;
          if (b.size <= OBJETIVO_BYTES) break;
        }
        return mejor;
      };
      const webp = await probar('image/webp');
      if (webp) return ok({ blob: webp, tipo: 'webp' as const });
      const jpeg = await probar('image/jpeg');
      return jpeg ? ok({ blob: jpeg, tipo: 'jpeg' as const }) : err({ detalle: 'no se pudo codificar la imagen' });
    } catch (e) {
      return err({ detalle: e instanceof Error ? e.message : 'imagen inválida' });
    }
  },
};
