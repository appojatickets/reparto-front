import { Geolocation } from '@capacitor/geolocation';
import type { EstadoPermiso, EstadoPermisos, Permisos } from '../../../application/ports/permisos';

/** El micrófono pertenece a la web; ubicación se consulta y concede en Android. */
export const crearPermisosAndroid = (microfono: Permisos, geo: Pick<typeof Geolocation, 'checkPermissions' | 'requestPermissions'> = Geolocation, pedirNotificaciones?: () => Promise<void>): Permisos => {
  const ubicacion = async (pedir: boolean): Promise<EstadoPermiso> => {
    try {
      let actual = await geo.checkPermissions();
      if (pedir && (actual.location === 'prompt' || actual.location === 'prompt-with-rationale')) actual = await geo.requestPermissions({ permissions: ['location'] });
      return actual.location === 'granted' ? 'concedido' : actual.location === 'denied' ? 'denegado' : 'pendiente';
    } catch { return 'pendiente'; }
  };
  const consultar = async (pedir: boolean): Promise<EstadoPermisos> => {
    const posicion = await ubicacion(pedir);
    const audio = await (pedir ? microfono.pedir() : microfono.estado());
    if (pedir) { try { await pedirNotificaciones?.(); } catch { /* El estado nativo muestra qué falta sin bloquear el reparto manual. */ } }
    return { ubicacion: posicion, microfono: audio.microfono };
  };
  return { estado: () => consultar(false), pedir: () => consultar(true) };
};
