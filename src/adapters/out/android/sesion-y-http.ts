import type { SesionStore } from '../../../application/ports/sesion-store';
import type { Tokens } from '../../../application/modelos';
import type { NativeBridge } from './bridge';

/** Tokens live in memory in JS; encrypted native storage is the source of truth for both interfaces. */
export const crearSesionYHttpAndroid = async (bridge: NativeBridge, apiUrl: string, fallback: typeof fetch = fetch): Promise<{ store: SesionStore; fetch: typeof fetch }> => {
  const base = new URL(apiUrl);
  if (base.protocol !== 'https:') throw new Error('La versión Android necesita una API HTTPS');
  const baseUrl = base.href.replace(/\/$/, '');
  await bridge.configure({ apiUrl: baseUrl });
  let tokens: Tokens | undefined = (await bridge.session()).tokens ?? undefined;
  let generacion = 0;
  const store: SesionStore = {
    cargar: () => tokens,
    guardar: (t) => { tokens = t; },
    borrar: () => { tokens = undefined; generacion++; void bridge.stop().catch(() => undefined); void bridge.clear().catch(() => undefined); },
  };
  const nativeFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin !== base.origin || !url.href.startsWith(`${baseUrl}/v1/`)) return fallback(request);
    request.signal.throwIfAborted();
    const version = generacion;
    const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();
    const operation = bridge.request({ method: request.method, path: url.href.slice(baseUrl.length), ...(body !== undefined ? { body } : {}), authenticated: request.headers.has('authorization') });
    // Cancellation stops delivery to the UI; native requests use their own bounded timeouts.
    const response = await new Promise<Awaited<typeof operation>>((resolve, reject) => {
      const aborted = (): void => { reject(new DOMException('Petición cancelada', 'AbortError')); };
      request.signal.addEventListener('abort', aborted, { once: true });
      void operation.then(resolve, reject).finally(() => { request.signal.removeEventListener('abort', aborted); });
    });
    request.signal.throwIfAborted();
    if (version === generacion) tokens = response.tokens ?? undefined;
    return new Response(response.status === 204 || response.status === 205 ? null : response.body, { status: response.status, headers: { 'content-type': 'application/json' } });
  };
  return { store, fetch: nativeFetch };
};
