import { Geolocation } from '@capacitor/geolocation';
import { err, ok } from '../../../domain/result';
import type { Ubicacion } from '../../../application/ports/ubicacion';

/** Foreground one-shot GPS for delivery buttons. Continuous GPS belongs to the native service. */
export const crearUbicacionAndroid = (): Ubicacion => ({
  disponible: true,
  actual: async () => {
    try {
      let permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') permission = await Geolocation.requestPermissions({ permissions: ['location'] });
      if (permission.location !== 'granted') return err('PERMISO');
      const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
      return ok({ lat: p.coords.latitude, lng: p.coords.longitude, precisionM: p.coords.accuracy, ...(p.coords.speed !== null && p.coords.speed >= 0 ? { velocidadMs: p.coords.speed } : {}) });
    } catch { return err('NO_DISPONIBLE'); }
  },
});
