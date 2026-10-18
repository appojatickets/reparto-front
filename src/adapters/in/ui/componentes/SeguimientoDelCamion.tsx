import { useEffect, useMemo, useState } from 'react';
import { crearSeguimiento } from '../../../../application/use-cases/seguimiento';
import type { ErrorUbicacion } from '../../../../application/ports/ubicacion';
import { useCasos } from '../contexto';

/** Cada cuánto se manda lo acumulado (y, sin GPS continuo, cada cuánto se lee). */
export const CADA_MS = 60_000;
/** Si el GPS continuo no da nada en este tiempo, se lee a mano (algunos teléfonos lo pausan). */
const SIN_PUNTOS_MS = 2 * 60_000;

type EstadoGps = { readonly tipo: 'activo'; readonly pantalla: boolean } | { readonly tipo: 'sin_permiso' } | { readonly tipo: 'sin_gps' } | { readonly tipo: 'iniciando' };

/**
 * Sigue al camión mientras la app está abierta (ADR 0052 del back): GPS continuo con un punto cada 15 s como mucho, que se manda cada minuto
 * (sin señal se guarda y se manda al volver), y la pantalla se mantiene encendida para que el navegador no deje de leer el GPS.
 * Límite de una app web: si el chofer pasa a Waze o Maps, el navegador pausa el GPS hasta que vuelve a la app.
 * Muestra una línea chica con el estado del GPS, para que el chofer sepa si se está registrando.
 */
export const SeguimientoDelCamion = () => {
  const { api, ubicacion, ahora, pantalla } = useCasos();
  const seguimiento = useMemo(() => crearSeguimiento({ api, ubicacion, ahora }), [api, ubicacion, ahora]);
  const [estado, setEstado] = useState<EstadoGps>({ tipo: 'iniciando' });

  useEffect(() => {
    let ultimoPunto = 0;
    let pantallaOk = false;
    const alPunto = (): void => { ultimoPunto = ahora().getTime(); setEstado({ tipo: 'activo', pantalla: pantallaOk }); };
    const alError = (e: ErrorUbicacion): void => { setEstado(e === 'PERMISO' ? { tipo: 'sin_permiso' } : { tipo: 'sin_gps' }); };
    const dejarDeSeguir = ubicacion.seguir?.((p) => { if (seguimiento.agregar(p) || ultimoPunto === 0) alPunto(); }, alError);

    const encenderPantalla = async (): Promise<void> => {
      if (!pantalla || document.visibilityState !== 'visible') return;
      pantallaOk = await pantalla.mantener();
      setEstado((e) => (e.tipo === 'activo' ? { tipo: 'activo', pantalla: pantallaOk } : e));
    };
    const tick = (): void => {
      if (document.visibilityState !== 'visible') return;
      const sinPuntos = !dejarDeSeguir || ahora().getTime() - ultimoPunto > SIN_PUNTOS_MS;
      const tarea = sinPuntos
        ? seguimiento.muestrear().then((r) => { if (r === 'sin_gps') setEstado((e) => (e.tipo === 'sin_permiso' ? e : { tipo: 'sin_gps' })); else alPunto(); })
        : seguimiento.enviar();
      void tarea.catch(() => undefined);
    };
    const alCambiarVisibilidad = (): void => {
      if (document.visibilityState === 'visible') {
        void encenderPantalla();
        tick();
      } else void seguimiento.enviar().catch(() => undefined);
    };
    void encenderPantalla();
    tick();
    const id = window.setInterval(tick, CADA_MS);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      dejarDeSeguir?.();
      void pantalla?.soltar();
      void seguimiento.enviar().catch(() => undefined);
    };
  }, [seguimiento, ubicacion, pantalla, ahora]);

  const texto = estado.tipo === 'activo'
    ? `GPS activo${estado.pantalla ? ' · pantalla encendida' : ''}`
    : estado.tipo === 'sin_permiso'
      ? 'GPS sin permiso: actívalo en el teléfono para que la ruta registre el recorrido.'
      : estado.tipo === 'sin_gps'
        ? 'Sin señal de GPS por ahora.'
        : 'Buscando GPS…';
  return <p className={`estado-gps estado-gps--${estado.tipo}`} role="status" aria-label="Estado del GPS">{texto}</p>;
};
