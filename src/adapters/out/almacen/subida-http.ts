import { err, ok } from '../../../domain/result';
import type { SubidaDeArchivos } from '../../../application/ports/imagenes';

/** PUT a la URL firmada de Storage, con el mismo formato que usa el SDK de Supabase (multipart con cacheControl). */
export const subidaHttp = (fetchFn: typeof fetch = globalThis.fetch.bind(globalThis)): SubidaDeArchivos => ({
  async subir(url, foto) {
    try {
      const form = new FormData();
      form.append('cacheControl', '3600');
      form.append('', foto.blob);
      const r = await fetchFn(url, { method: 'PUT', body: form, headers: { 'x-upsert': 'false' }, signal: AbortSignal.timeout(60_000) });
      return r.ok ? ok(undefined) : err({ detalle: `HTTP ${r.status}` });
    } catch (e) {
      return err({ detalle: e instanceof Error ? e.message : 'red' });
    }
  },
});
