import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as EventoPuntero, type RefObject } from 'react';
import { destinoDeArrastre, velocidadDeDesplazamiento } from '../../../domain/arrastre';

/** Lo que se ve mientras se arrastra una fila: cuál es, de dónde salió, dónde caería si se soltara ahora y cuánto lleva movido el dedo. */
export type EstadoArrastre = { readonly id: string; readonly origen: number; readonly destino: number; readonly dy: number; readonly espacio: number };

type Sesion = {
  readonly id: string;
  readonly pointerId: number;
  readonly origen: number;
  /** Centros de todas las filas al empezar, en coordenadas de página (no cambian aunque la pantalla se desplace). */
  readonly medios: readonly number[];
  readonly yPaginaInicial: number;
  readonly espacio: number;
  ultimoY: number;
  destino: number;
  cuadro: number;
  limpiar: () => void;
};

/**
 * Arrastrar una fila de una lista para cambiarla de lugar con el dedo (o el mouse): se agarra el asa, se mueve y al soltar `alSoltar` recibe
 * el lugar final. Mientras se arrastra, la fila sigue al dedo, las demás se corren para abrir el hueco y la pantalla se desplaza sola cuando
 * el dedo llega al borde (así se puede llevar una parada lejos en una lista larga). Escape cancela.
 */
export const useArrastre = (lista: RefObject<HTMLElement | null>, ids: readonly string[], alSoltar: (id: string, destino: number) => void) => {
  const [estado, setEstado] = useState<EstadoArrastre | undefined>();
  const sesion = useRef<Sesion | undefined>(undefined);

  const actualizar = (clientY: number): void => {
    const s = sesion.current;
    if (!s) return;
    s.ultimoY = clientY;
    const dy = clientY + window.scrollY - s.yPaginaInicial;
    s.destino = destinoDeArrastre(s.medios, s.origen, (s.medios[s.origen] ?? 0) + dy);
    setEstado({ id: s.id, origen: s.origen, destino: s.destino, dy, espacio: s.espacio });
  };

  const terminar = (confirmar: boolean): void => {
    const s = sesion.current;
    if (!s) return;
    s.limpiar();
    sesion.current = undefined;
    setEstado(undefined);
    if (confirmar && s.destino !== s.origen) alSoltar(s.id, s.destino);
  };

  // Si la pantalla se cierra en medio de un arrastre no queda nada corriendo.
  useEffect(() => () => { sesion.current?.limpiar(); }, []);

  const empezar = (e: EventoPuntero<HTMLElement>, id: string): void => {
    const contenedor = lista.current;
    const origen = ids.indexOf(id);
    if (sesion.current || e.button !== 0 || !contenedor || origen < 0 || contenedor.children.length !== ids.length) return;
    const cajas = Array.from(contenedor.children, (f) => f.getBoundingClientRect());
    const propia = cajas[origen];
    if (!propia) return;
    const scroll = window.scrollY;
    const vecina = cajas[origen + 1];
    const previa = cajas[origen - 1];
    const hueco = vecina ? vecina.top - propia.bottom : previa ? propia.top - previa.bottom : 0;

    const alTeclear = (t: KeyboardEvent): void => { if (t.key === 'Escape') terminar(false); };
    window.addEventListener('keydown', alTeclear);
    const s: Sesion = {
      id,
      pointerId: e.pointerId,
      origen,
      medios: cajas.map((c) => c.top + scroll + c.height / 2),
      yPaginaInicial: e.clientY + scroll,
      espacio: propia.height + hueco,
      ultimoY: e.clientY,
      destino: origen,
      cuadro: 0,
      limpiar: () => {
        window.cancelAnimationFrame(s.cuadro);
        window.removeEventListener('keydown', alTeclear);
      },
    };
    // Cerca del borde de la pantalla la lista se desplaza sola, y la fila sigue bajo el dedo.
    const bucle = (): void => {
      if (sesion.current !== s) return;
      const v = velocidadDeDesplazamiento(s.ultimoY, window.innerHeight);
      if (v !== 0) {
        window.scrollBy(0, v);
        actualizar(s.ultimoY);
      }
      s.cuadro = window.requestAnimationFrame(bucle);
    };
    sesion.current = s;
    // Con el dedo capturado, los movimientos siguen llegando al asa aunque salga de ella.
    if (typeof e.currentTarget.setPointerCapture === 'function') e.currentTarget.setPointerCapture(e.pointerId);
    if ('vibrate' in navigator) navigator.vibrate(12);
    s.cuadro = window.requestAnimationFrame(bucle);
    setEstado({ id, origen, destino: origen, dy: 0, espacio: s.espacio });
  };

  /** Eventos del asa de una fila (el botón que se agarra para arrastrar). */
  const asa = (id: string) => ({
    onPointerDown: (e: EventoPuntero<HTMLElement>): void => { empezar(e, id); },
    onPointerMove: (e: EventoPuntero<HTMLElement>): void => { if (sesion.current?.pointerId === e.pointerId) actualizar(e.clientY); },
    onPointerUp: (e: EventoPuntero<HTMLElement>): void => { if (sesion.current?.pointerId === e.pointerId) terminar(true); },
    onPointerCancel: (e: EventoPuntero<HTMLElement>): void => { if (sesion.current?.pointerId === e.pointerId) terminar(false); },
    // Una pulsación larga en el celular no debe abrir el menú del navegador en vez de arrastrar.
    onContextMenu: (e: { preventDefault: () => void }): void => { e.preventDefault(); },
  });

  /** Cómo se dibuja la fila `i` mientras se arrastra: la agarrada sigue al dedo y las que quedan en el camino se corren un lugar. */
  const fila = (i: number): { readonly clase: string; readonly estilo?: CSSProperties } => {
    if (!estado) return { clase: '' };
    if (i === estado.origen) return { clase: ' parada--arrastrada', estilo: { transform: `translateY(${estado.dy}px)` } };
    if (estado.origen < estado.destino && i > estado.origen && i <= estado.destino) return { clase: ' parada--corrida', estilo: { transform: `translateY(${-estado.espacio}px)` } };
    if (estado.origen > estado.destino && i >= estado.destino && i < estado.origen) return { clase: ' parada--corrida', estilo: { transform: `translateY(${estado.espacio}px)` } };
    return { clase: ' parada--corrida' };
  };

  return { arrastrando: estado !== undefined, asa, fila };
};
