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
  /** Pausas (ms) entre reintentos cuando el servidor está despertando. Por defecto suman ~57 s. */
  readonly esperasMs?: readonly number[];
  readonly esperar?: (ms: number) => Promise<void>;
  /** `true` cuando empieza a reintentar porque el servidor no responde; `false` al terminar. Para mostrar un aviso. */
  readonly alEsperarServidor?: (activo: boolean) => void;
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

/** Render Free se duerme tras 15 min sin uso y tarda hasta ~1 min en despertar. */
const ESPERAS_POR_DEFECTO: readonly number[] = [1000, 2000, 4000, 8000, 12000, 15000, 15000];

type OpcionesLlamada = {
  /** Renovar la sesión ante un 401 (no aplica al login). */
  readonly renovar?: boolean;
  /** Reintentar si el servidor no responde. Solo para llamadas que se pueden repetir sin efectos dobles. */
  readonly repetible?: boolean;
  readonly signal?: AbortSignal | undefined;
};

export const createHttpApiClient = ({ baseUrl, store, alExpirarSesion, timeoutMs = 90_000, esperasMs = ESPERAS_POR_DEFECTO, esperar = (ms) => new Promise((r) => { setTimeout(r, ms); }), alEsperarServidor, fetch }: HttpApiClientOptions): ApiClient => {
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

  async function intentar<T>(llamar: () => Promise<Respuesta<T>>, renovarSesion: boolean): Promise<Result<T, ApiError>> {
    try {
      let r = await llamar();
      if (r.response.status === 401 && renovarSesion && (await renovar())) r = await llamar();
      return r.response.ok ? ok(r.data as T) : err(aError(r.response, r.error));
    } catch (e) {
      const nombre = e instanceof Error ? e.name : '';
      return err({ kind: nombre === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK' });
    }
  }

  /**
   * Un servidor dormido responde sin CORS o con 502/503/504 del proxy (sin cuerpo de la API): al navegador le parece
   * «sin conexión». Es transitorio, así que las llamadas repetibles se reintentan con pausas crecientes.
   */
  const esTransitorio = (r: Result<unknown, ApiError>): boolean =>
    !r.ok && (r.error.kind === 'NETWORK' || (r.error.kind === 'HTTP' && [502, 503, 504].includes(r.error.status ?? 0) && r.error.codigo === undefined));

  async function ejecutar<T>(llamar: () => Promise<Respuesta<T>>, { renovar: renovarSesion = true, repetible = false, signal }: OpcionesLlamada = {}): Promise<Result<T, ApiError>> {
    let esperando = false;
    try {
      for (let n = 0; ; n++) {
        const r = await intentar(llamar, renovarSesion);
        const pausa = esperasMs[n];
        if (!repetible || !esTransitorio(r) || pausa === undefined || signal?.aborted) return r;
        if (!esperando) {
          esperando = true;
          alEsperarServidor?.(true);
        }
        await esperar(pausa);
      }
    } finally {
      if (esperando) alEsperarServidor?.(false);
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
      const r = await ejecutar(() => client.POST('/v1/auth/login', { body: { username, pin }, signal: timeout() }), { renovar: false, repetible: true });
      return mapear(r, (d) => ({ tokens: { accessToken: d.accessToken, refreshToken: d.refreshToken }, usuario: { id: d.usuario.id, username: d.usuario.username, nombre: d.usuario.nombre, rol: d.usuario.rol, editor: d.usuario.editor } }));
    },
    yo: () => ejecutar(() => client.GET('/v1/me', { signal: timeout() }), { repetible: true }),

    async buscarClientes(q, opciones = {}) {
      const r = await ejecutar(() => client.GET('/v1/clientes/buscar', { params: { query: { q, ...(opciones.comuna ? { comuna: opciones.comuna } : {}), ...(opciones.limite ? { limite: opciones.limite } : {}) } }, signal: AbortSignal.any([timeout(opciones.signal), AbortSignal.timeout(20_000)]) }), { repetible: true, signal: opciones.signal });
      return mapear(r, (d) => d.resultados);
    },
    crearCliente: (fila) => ejecutar(() => client.POST('/v1/clientes', { body: fila, signal: timeout() })),
    importarClientes: (filas) => ejecutar(() => client.POST('/v1/clientes/importaciones', { body: { filas: [...filas] }, signal: timeout() }), { repetible: true }),
    async resumenComunas() {
      const r = await ejecutar(() => client.GET('/v1/locales/comunas', { signal: timeout() }), { repetible: true });
      return mapear(r, (d) => d.comunas);
    },
    listarLocales: (filtro) => ejecutar(() => client.GET('/v1/locales', { params: { query: { ...(filtro.comuna ? { comuna: filtro.comuna } : {}), ...(filtro.texto ? { texto: filtro.texto } : {}), ...(filtro.limite ? { limite: filtro.limite } : {}) } }, signal: timeout() }), { repetible: true }),
    obtenerLocal: (id) => ejecutar(() => client.GET('/v1/locales/{id}', { params: { path: { id } }, signal: timeout() }), { repetible: true }),
    corregirCliente: async (id, cambios) => sinCuerpo(await ejecutar(() => client.PATCH('/v1/clientes/{id}', { params: { path: { id } }, body: cambios, signal: timeout() }))),
    eliminarLocal: async (id) => sinCuerpo(await ejecutar(() => client.DELETE('/v1/locales/{id}', { params: { path: { id } }, signal: timeout() }))),
    actualizarLocal: async (id, cambios) => sinCuerpo(await ejecutar(() => client.PATCH('/v1/locales/{id}', { params: { path: { id } }, body: cambios, signal: timeout() }), { repetible: true })),

    solicitarUrlSubida: (localId, tipo) => ejecutar(() => client.POST('/v1/archivos/url-subida', { body: { localId, tipo }, signal: timeout() }), { repetible: true }),
    registrarFoto: async (id, path) => sinCuerpo(await ejecutar(() => client.PUT('/v1/locales/{id}/foto', { params: { path: { id } }, body: { path }, signal: timeout() }), { repetible: true })),
    urlFoto: (id) => ejecutar(() => client.GET('/v1/locales/{id}/foto-url', { params: { path: { id } }, signal: timeout() }), { repetible: true }),

    async listarPropuestas(estado) {
      const r = await ejecutar(() => client.GET('/v1/pines/propuestas', { params: { query: { estado } }, signal: timeout() }), { repetible: true });
      return mapear(r, (d) => d.propuestas);
    },
    pinesParaRevisar: (estado) => ejecutar(() => client.GET('/v1/pines/revision', { params: { query: { estado } }, signal: timeout() }), { repetible: true }),
    resolverPropuesta: async (id, accion) => sinCuerpo(await ejecutar(() => client.POST('/v1/pines/propuestas/{id}/resolver', { params: { path: { id } }, body: { accion }, signal: timeout() }))),

    async listarUsuarios() {
      const r = await ejecutar(() => client.GET('/v1/usuarios', { signal: timeout() }), { repetible: true });
      return mapear(r, (d) => d.usuarios);
    },
    crearUsuario: (datos) => ejecutar(() => client.POST('/v1/usuarios', { body: datos, signal: timeout() })),
    resetearPin: async (id, pin) => sinCuerpo(await ejecutar(() => client.POST('/v1/usuarios/{id}/pin', { params: { path: { id } }, body: { pin }, signal: timeout() }))),
    cambiarEstadoUsuario: async (id, activo) => sinCuerpo(await ejecutar(() => client.PATCH('/v1/usuarios/{id}', { params: { path: { id } }, body: { activo }, signal: timeout() }))),

    cambiarEditorUsuario: async (id, editor) => sinCuerpo(await ejecutar(() => client.PUT('/v1/usuarios/{id}/editor', { params: { path: { id } }, body: { editor }, signal: timeout() }))),

    async listarCamiones(opciones = {}) {
      const r = await ejecutar(() => client.GET('/v1/camiones', { params: { query: opciones.incluirInactivos ? { incluirInactivos: 'true' } : {} }, signal: timeout() }), { repetible: true });
      return mapear(r, (d) => d.camiones);
    },
    crearCamion: (datos) => ejecutar(() => client.POST('/v1/camiones', { body: datos, signal: timeout() })),
    actualizarCamion: (id, cambios) => ejecutar(() => client.PATCH('/v1/camiones/{id}', { params: { path: { id } }, body: cambios, signal: timeout() })),

    fijarPinDesdeEnlace: (localId, enlace) => ejecutar(() => client.POST('/v1/locales/{id}/pin-desde-enlace', { params: { path: { id: localId } }, body: { enlace }, signal: timeout() })),
    buscarPinesPendientes: () => ejecutar(() => client.POST('/v1/locales/buscar-pines', { signal: timeout() })),
    estadoBusquedaPines: () => ejecutar(() => client.GET('/v1/locales/buscar-pines', { signal: timeout() }), { repetible: true }),
    exportarLocales: (filtro = {}) =>
      ejecutar(() => client.GET('/v1/exportaciones/locales', {
        params: { query: { ...(filtro.comunas && filtro.comunas.length > 0 ? { comunas: filtro.comunas.join(',') } : {}), ...(filtro.pin ? { pin: filtro.pin } : {}), ...(filtro.foto ? { foto: filtro.foto } : {}), ...(filtro.texto?.trim() ? { texto: filtro.texto.trim() } : {}) } },
        signal: timeout(),
      }), { repetible: true }),
    reportarFoto: async (id, reporte) => sinCuerpo(await ejecutar(() => client.POST('/v1/locales/{id}/foto/reportar', { params: { path: { id } }, body: reporte, signal: timeout() }))),
    fotosParaRevision: () => ejecutar(() => client.GET('/v1/fotos/revision', { signal: timeout() }), { repetible: true }),
    verificarFoto: async (id, fotoPath, verificada) => sinCuerpo(await ejecutar(() => client.PUT('/v1/locales/{id}/foto/verificacion', { params: { path: { id } }, body: { fotoPath, verificada }, signal: timeout() }), { repetible: true })),
    reportarLocal: async (id, reporte) => sinCuerpo(await ejecutar(() => client.POST('/v1/locales/{id}/reportes', { params: { path: { id } }, body: reporte, signal: timeout() }))),
    verReportes: () => ejecutar(() => client.GET('/v1/reportes', { signal: timeout() }), { repetible: true }),
    resolverReporteLocal: async (id, accion) => sinCuerpo(await ejecutar(() => client.POST('/v1/reportes/{id}/resolver', { params: { path: { id } }, body: { accion }, signal: timeout() }))),
    resolverReporteFoto: async (id, accion) => sinCuerpo(await ejecutar(() => client.POST('/v1/fotos/reportes/{id}/resolver', { params: { path: { id } }, body: { accion }, signal: timeout() }))),
    verificarPin: async (id, verificado) => sinCuerpo(await ejecutar(() => client.PUT('/v1/locales/{id}/pin/verificacion', { params: { path: { id } }, body: { verificado }, signal: timeout() }))),
    quitarFoto: async (id) => sinCuerpo(await ejecutar(() => client.DELETE('/v1/locales/{id}/foto', { params: { path: { id } }, signal: timeout() }))),
    async listarVendedores(opciones = {}) {
      const r = await ejecutar(() => client.GET('/v1/vendedores', { params: { query: opciones.incluirInactivos ? { incluirInactivos: 'true' } : {} }, signal: timeout() }), { repetible: true });
      return mapear(r, (d) => d.vendedores);
    },
    crearVendedor: (datos) => ejecutar(() => client.POST('/v1/vendedores', { body: datos, signal: timeout() })),
    actualizarVendedor: (id, cambios) => ejecutar(() => client.PATCH('/v1/vendedores/{id}', { params: { path: { id } }, body: cambios, signal: timeout() })),

    async listarFacturas(filtro = {}) {
      const query = {
        ...(filtro.fecha ? { fecha: filtro.fecha } : {}),
        ...(filtro.incluirAnuladas ? { incluirAnuladas: 'true' as const } : {}),
        ...(filtro.incluirHechas ? { incluirHechas: 'true' as const } : {}),
      };
      const r = await ejecutar(() => client.GET('/v1/facturas', { params: { query }, signal: timeout() }), { repetible: true });
      return mapear(r, (d) => d.facturas);
    },
    registrarFactura: (datos) => ejecutar(() => client.POST('/v1/facturas', { body: datos, signal: timeout() })),
    actualizarFactura: (id, cambios) => ejecutar(() => client.PATCH('/v1/facturas/{id}', { params: { path: { id } }, body: cambios, signal: timeout() })),

    async miJornada() {
      const r = await ejecutar(() => client.GET('/v1/jornada', { signal: timeout() }), { repetible: true });
      return mapear(r, (d) => d.jornada);
    },
    iniciarJornada: (camionId) => ejecutar(() => client.POST('/v1/jornada', { body: { camionId }, signal: timeout() })),
    async terminarRuta() {
      const r = await ejecutar(() => client.POST('/v1/jornada/terminar', { signal: timeout() }));
      return mapear(r, (d) => d.resumen);
    },
    terminarJornada: async () => sinCuerpo(await ejecutar(() => client.DELETE('/v1/jornada', { signal: timeout() }))),

    obtenerConfig: () => ejecutar(() => client.GET('/v1/empresa/config', { signal: timeout() }), { repetible: true }),
    guardarConfig: (config) => ejecutar(() => client.PUT('/v1/empresa/config', { body: config, signal: timeout() })),

    enviarPosiciones: (puntos) => ejecutar(() => client.POST('/v1/jornada/posiciones', { body: { puntos: puntos.map((p) => ({ ...p })) }, signal: timeout() })),
    analitica: () => ejecutar(() => client.GET('/v1/analitica', { signal: timeout() }), { repetible: true }),
    ejecutarAnalisis: () => ejecutar(() => client.POST('/v1/analitica/ejecutar', { signal: timeout() })),
    registrarEvento: (facturaId, evento) => ejecutar(() => client.POST('/v1/entregas/{id}/eventos', { params: { path: { id: facturaId } }, body: evento, signal: timeout() })),

    async obtenerHorario(localId) {
      const r = await ejecutar(() => client.GET('/v1/locales/{id}/horario', { params: { path: { id: localId } }, signal: timeout() }), { repetible: true });
      return mapear(r, (d) => d.dias);
    },
    async guardarHorario(localId, dias) {
      const r = await ejecutar(() => client.PUT('/v1/locales/{id}/horario', { params: { path: { id: localId } }, body: { dias: dias.map((d) => ({ dia: d.dia, cerrado: d.cerrado, tramos: [...d.tramos] })) }, signal: timeout() }));
      return mapear(r, (d) => d.dias);
    },

    verRuta: (camionId, fecha) => ejecutar(() => client.GET('/v1/rutas', { params: { query: { camionId, fecha } }, signal: timeout() }), { repetible: true }),
    planificarRuta: (camionId, fecha, salidaMin, orden) => ejecutar(() => client.POST('/v1/rutas/planificar', { body: { camionId, fecha, ...(salidaMin !== undefined ? { salidaMin } : {}), ...(orden !== undefined ? { orden } : {}) }, signal: timeout() })),
    operarRuta: (camionId, fecha, version, operacion) => ejecutar(() => client.POST('/v1/rutas/operaciones', { body: { camionId, fecha, version, operacion }, signal: timeout() })),
  };
};
