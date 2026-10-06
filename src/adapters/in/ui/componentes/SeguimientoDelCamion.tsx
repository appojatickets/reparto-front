import { useEffect, useMemo } from 'react';
import { crearSeguimiento } from '../../../../application/use-cases/seguimiento';
import { useCasos } from '../contexto';

/** Cada cuánto se lee el GPS del camión mientras la app está abierta. */
export const CADA_MS = 60_000;

/**
 * No muestra nada: mientras la app está abierta (en pantalla) manda cada minuto dónde está el camión. El servidor lo guarda para aprender
 * (se sigue al camión, no a la persona) y anota solo la llegada si el camión se queda junto al pin de una entrega. Una app web no puede
 * seguir el GPS con la pantalla apagada o mientras navegas con otra app: ahí quedan huecos y valen los avisos LLEGUÉ y ENTREGADO.
 */
export const SeguimientoDelCamion = () => {
  const { api, ubicacion, ahora } = useCasos();
  const seguimiento = useMemo(() => crearSeguimiento({ api, ubicacion, ahora }), [api, ubicacion, ahora]);
  useEffect(() => {
    const tomar = (): void => {
      if (document.visibilityState !== 'visible') return;
      void seguimiento.muestrear().catch(() => undefined);
    };
    tomar();
    const id = window.setInterval(tomar, CADA_MS);
    document.addEventListener('visibilitychange', tomar);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tomar);
    };
  }, [seguimiento]);
  return null;
};
