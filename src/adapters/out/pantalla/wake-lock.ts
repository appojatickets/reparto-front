import type { PantallaEncendida } from '../../../application/ports/ubicacion';

type Bloqueo = { release(): Promise<void>; readonly released?: boolean };
type ConWakeLock = { readonly wakeLock?: { request(tipo: 'screen'): Promise<Bloqueo> } };

/** Wake Lock del navegador (Chrome en Android lo soporta): la pantalla no se apaga mientras la app está a la vista. */
export const crearPantallaEncendida = (nav: ConWakeLock = globalThis.navigator): PantallaEncendida => {
  let bloqueo: Bloqueo | undefined;
  return {
    disponible: nav.wakeLock !== undefined,
    async mantener() {
      if (!nav.wakeLock) return false;
      if (bloqueo && bloqueo.released !== true) return true;
      try {
        bloqueo = await nav.wakeLock.request('screen');
        return true;
      } catch {
        return false;
      }
    },
    async soltar() {
      const b = bloqueo;
      bloqueo = undefined;
      await b?.release().catch(() => undefined);
    },
  };
};
