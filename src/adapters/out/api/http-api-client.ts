import createClient from 'openapi-fetch';
import { err, ok, type Result } from '../../../domain/result';
import type { ApiClient, ApiError, HealthReport } from '../../../application/ports/api-client';
import type { SesionStore } from '../../../application/ports/sesion-store';
import type { paths } from './schema';

export type HttpApiClientOptions = {
  readonly baseUrl: string;
  readonly store: SesionStore;
  /** Se llama cuando el servidor rechaza también el refresh token: hay que volver a entrar. */
  readonly alExpirarSesion?: () => void;
  /** Render Free puede tardar ~1 min en despertar. */
  readonly timeoutMs?: number;
  readonly fetch?: typeof globalThis.fetch;
};

type Respuesta<T> = { data?: T; error?: unknown; response: Response };

const aError = (r: Response, cuerpo: unknown): ApiError => {
  const c = typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>) : {};
  const codigo = c['codigo'];
  const mensaje = c['mensaje'];
  return {
    kind: 'HTTP',
    status: r.status,
    ...(typeof codigo === 'string' ? { codigo } : {}),
    ...(typeof mensaje === 'string' ? { mensaje } : {}),
    ...(c['detalle'] !== undefined ? { detalle: c['detalle'] } : {}),
  };
};

const cuerpoDeSalud = (data: HealthReport | undefined, error: HealthReport | undefined): Result<HealthReport, ApiError> => {
  const body = data ?? error;
  return body ? ok(body) : err({ kind: 'UNEXPECTED' });
};

export const createHttpApiClient = ({ baseUrl, store, alExpirarSesion, timeoutMs = 90_000, fetch }: HttpApiClientOptions): ApiClient => {
  const client = createClient<paths>({ baseUrl, ...(fetch ? { fetch } : {}) });
  client.use({
    onRequest: ({ request }) => {
      const t = store.cargar();
      if (t && !request.headers.has('authorization')) request.headers.set('authorization', `Bearer ${t.accessToken}`);
      return request;
    },
  });

  const timeout = (signal?: AbortSignal): AbortSignal => (signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs));

  // Una sola renovación a la vez: si varias llamadas reciben 401 juntas, comparten el mismo refresh.
  let renovando: Promise<boolean> | undefined;
  const renovar = (): Promise<boolean> => {
    renovando ??= (async () => {
      const tokens = store.cargar();
      if (!tokens) return false;
      try {
        const r = await client.POST('/v1/auth/refresh', { body: { refreshToken: tokens.refreshToken }, headers: { authorization: '' }, signal: timeout() });
        if (r.response.ok && r.data) {
          store.guardar({ accessToken: r.data.accessToken, refreshToken: r.data.refreshToken });
          return true;
        }
        if (r.response.status === 401) {
          store.borrar();
          alExpirarSesion?.();
        }
        return false;
      } catch {
        return false; // sin señal: se conserva la sesión y se reintentará más tarde
      } finally {
        renovando = undefined;
      }
    })();
    return renovando;
  };

  async function ejecutar<T>(llamar: () => Promise<Respuesta<T>>, reintentar = true): Promise<Result<T, ApiError>> {
    try {
      let r = await llamar();
      if (r.response.status === 401 && reintentar && (await renovar())) r = await llamar();
      return r.response.ok ? ok(r.data as T) : err(aError(r.response, r.error));
    } catch (e) {
      const nombre = e instanceof Error ? e.name : '';
      return err({ kind: nombre === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK' });
    }
  }
  const sinCuerpo = (r: Result<unknown, ApiError>): Result<void, ApiError> => (r.ok ? ok(undefined) : r);
  function mapear<A, B>(r: Result<A, ApiError>, f: (a: A) => B): Result<B, ApiError> {
    return r.ok ? ok(f(r.value)) : r;
  }

  return {
    async getHealth(signal) {
      try {
        const { data, error } = await client.GET('/v1/health', { signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) });
        // 200 y 503 traen el mismo cuerpo: la API informa «degraded» con 503.
        return cuerpoDeSalud(data, error);
      } catch (e) {
        return err({ kind: e instanceof Error && e.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK' });
      }
    },

    async iniciarSesion(username, pin) {
      const r = await ejecutar(() => client.POST('/v1/auth/login', { body: { username, pin }, signal: timeout() }), false);
      return mapear(r, (d) => ({ tokens: { accessToken: d.accessToken, refreshToken: d.refreshToken }, usuario: { id: d.usuario.id, username: d.usuario.username, nombre: d.usuario.nombre, rol: d.usuario.rol } }));
    },
    yo: () => ejecutar(() => client.GET('/v1/me', { signal: timeout() })),

    async buscarClientes(q, opciones = {}) {
      const r = await ejecutar(() => client.GET('/v1/clientes/buscar', { params: { query: { q, ...(opciones.comuna ? { comuna: opciones.comuna } : {}), ...(opciones.limite ? { limite: opciones.limite } : {}) } }, signal: AbortSignal.any([timeout(opciones.signal), AbortSignal.timeout(20_000)]) }));
      return mapear(r, (d) => d.resultados);
    },
    crearCliente: (fila) => ejecutar(() => client.POST('/v1/clientes', { body: fila, signal: timeout() })),
    importarClientes: (filas) => ejecutar(() => client.POST('/v1/clientes/importaciones', { body: { filas: [...filas] }, signal: timeout() })),
    obtenerLocal: (id) => ejecutar(() => client.GET('/v1/locales/{id}', { params: { path: { id } }, signal: timeout() })),
    actualizarLocal: async (id, cambios) => sinCuerpo(await ejecutar(() => client.PATCH('/v1/locales/{id}', { params: { path: { id } }, body: cambios, signal: timeout() }))),

    solicitarUrlSubida: (localId, tipo) => ejecutar(() => client.POST('/v1/archivos/url-subida', { body: { localId, tipo }, signal: timeout() })),
    registrarFoto: async (id, path) => sinCuerpo(await ejecutar(() => client.PUT('/v1/locales/{id}/foto', { params: { path: { id } }, body: { path }, signal: timeout() }))),
    urlFoto: (id) => ejecutar(() => client.GET('/v1/locales/{id}/foto-url', { params: { path: { id } }, signal: timeout() })),

    importarPines: (pines) => ejecutar(() => client.POST('/v1/pines/importaciones', { body: { pines: [...pines] }, signal: timeout() })),
    async listarPropuestas(estado) {
      const r = await ejecutar(() => client.GET('/v1/pines/propuestas', { params: { query: { estado } }, signal: timeout() }));
      return mapear(r, (d) => d.propuestas);
    },
    resolverPropuesta: async (id, accion) => sinCuerpo(await ejecutar(() => client.POST('/v1/pines/propuestas/{id}/resolver', { params: { path: { id } }, body: { accion }, signal: timeout() }))),

    async listarUsuarios() {
      const r = await ejecutar(() => client.GET('/v1/usuarios', { signal: timeout() }));
      return mapear(r, (d) => d.usuarios);
    },
    crearUsuario: (datos) => ejecutar(() => client.POST('/v1/usuarios', { body: datos, signal: timeout() })),
    resetearPin: async (id, pin) => sinCuerpo(await ejecutar(() => client.POST('/v1/usuarios/{id}/pin', { params: { path: { id } }, body: { pin }, signal: timeout() }))),
    cambiarEstadoUsuario: async (id, activo) => sinCuerpo(await ejecutar(() => client.PATCH('/v1/usuarios/{id}', { params: { path: { id } }, body: { activo }, signal: timeout() }))),
  };
};
