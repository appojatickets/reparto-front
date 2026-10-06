import type { EstadoPermiso, EstadoPermisos, Permisos } from '../../../application/ports/permisos';

type Entorno = {
  readonly permissions?: Pick<Permissions, 'query'> | undefined;
  readonly geolocation?: Pick<Geolocation, 'getCurrentPosition'> | undefined;
  readonly mediaDevices?: Pick<MediaDevices, 'getUserMedia'> | undefined;
};

const entornoDelNavegador = (): Entorno => {
  try {
    const n = globalThis.navigator;
    return { permissions: n.permissions, geolocation: n.geolocation, mediaDevices: n.mediaDevices };
  } catch {
    return {};
  }
};

const consultar = async (e: Entorno, nombre: 'geolocation' | 'microphone'): Promise<EstadoPermiso> => {
  try {
    if (!e.permissions) return 'pendiente';
    const r = await e.permissions.query({ name: nombre });
    return r.state === 'granted' ? 'concedido' : r.state === 'denied' ? 'denegado' : 'pendiente';
  } catch {
    return 'pendiente';
  }
};

const pedirUbicacion = (e: Entorno): Promise<EstadoPermiso> =>
  new Promise((resolver) => {
    if (!e.geolocation) {
      resolver('pendiente');
      return;
    }
    e.geolocation.getCurrentPosition(
      () => { resolver('concedido'); },
      (error) => { resolver(error.code === error.PERMISSION_DENIED ? 'denegado' : 'pendiente'); },
      { enableHighAccuracy: false, timeout: 20_000, maximumAge: 600_000 },
    );
  });

const pedirMicrofono = async (e: Entorno): Promise<EstadoPermiso> => {
  if (!e.mediaDevices) return 'pendiente';
  try {
    const flujo = await e.mediaDevices.getUserMedia({ audio: true });
    flujo.getTracks().forEach((t) => { t.stop(); });
    return 'concedido';
  } catch (error) {
    return error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError') ? 'denegado' : 'pendiente';
  }
};

/** Los permisos del navegador: se consulta primero y solo se pregunta lo que aún no se ha preguntado. */
export const crearPermisosWeb = (entorno: Entorno = entornoDelNavegador()): Permisos => {
  const estado = async (): Promise<EstadoPermisos> => ({ ubicacion: await consultar(entorno, 'geolocation'), microfono: await consultar(entorno, 'microphone') });
  return {
    estado,
    async pedir() {
      const antes = await estado();
      // De a uno: dos avisos del navegador al mismo tiempo se pisan.
      const ubicacion = antes.ubicacion === 'pendiente' ? await pedirUbicacion(entorno) : antes.ubicacion;
      const microfono = antes.microfono === 'pendiente' ? await pedirMicrofono(entorno) : antes.microfono;
      return { ubicacion, microfono };
    },
  };
};
