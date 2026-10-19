import { useEffect, useRef } from 'react';
import { Boton } from './ui';

type Sesion = { destino: number; origen: number; pasos: number; temporizador: ReturnType<typeof setTimeout> | undefined; boton: HTMLButtonElement };

/** Una pulsación mantenida previsualiza varias posiciones; al soltar se guarda una sola operación. */
export const BotonDesplazar = ({ cliente, posicion, total, sentido, ocupado, mover }: {
  readonly cliente: string; readonly posicion: number; readonly total: number; readonly sentido: -1 | 1; readonly ocupado: boolean;
  readonly mover: (posicion: number, provisional?: boolean, cancelar?: boolean) => void;
}) => {
  const sesion = useRef<Sesion | undefined>(undefined);
  const acciones = useRef(mover);
  const ignorarClick = useRef(false);
  useEffect(() => { acciones.current = mover; }, [mover]);
  useEffect(() => {
    const terminar = (cancelar: boolean): void => {
      const s = sesion.current;
      if (!s) return;
      sesion.current = undefined;
      if (s.temporizador !== undefined) clearTimeout(s.temporizador);
      acciones.current(cancelar ? s.origen : s.destino, false, cancelar);
    };
    const soltar = (): void => { terminar(false); };
    const cancelar = (): void => { terminar(true); };
    const tecla = (e: KeyboardEvent): void => { if (e.key === 'Escape') cancelar(); };
    const visibilidad = (): void => { if (document.visibilityState !== 'visible') cancelar(); };
    window.addEventListener('pointerup', soltar, true);
    window.addEventListener('pointercancel', cancelar, true);
    window.addEventListener('blur', cancelar);
    window.addEventListener('keydown', tecla);
    document.addEventListener('visibilitychange', visibilidad);
    return () => {
      window.removeEventListener('pointerup', soltar, true);
      window.removeEventListener('pointercancel', cancelar, true);
      window.removeEventListener('blur', cancelar);
      window.removeEventListener('keydown', tecla);
      document.removeEventListener('visibilitychange', visibilidad);
      const s = sesion.current;
      if (s?.temporizador !== undefined) clearTimeout(s.temporizador);
    };
  }, []);
  const iniciar = (boton: HTMLButtonElement): void => {
    if (sesion.current || ocupado) return;
    ignorarClick.current = true;
    const s: Sesion = { origen: posicion, destino: posicion, pasos: 0, temporizador: undefined, boton };
    sesion.current = s;
    const avanzar = (): void => {
      if (sesion.current !== s) return;
      const siguiente = Math.max(0, Math.min(total - 1, s.destino + sentido));
      if (siguiente === s.destino) return;
      s.destino = siguiente;
      s.pasos += 1;
      acciones.current(s.destino, true);
      const fila = s.boton.closest('li');
      if (fila && typeof fila.scrollIntoView === 'function') fila.scrollIntoView({ block: 'nearest' });
      s.temporizador = setTimeout(avanzar, s.pasos >= 4 ? 80 : 160);
    };
    avanzar();
    if (s.temporizador !== undefined) clearTimeout(s.temporizador);
    s.temporizador = setTimeout(avanzar, 350);
  };
  const texto = sentido === -1 ? 'SUBIR' : 'BAJAR';
  return <Boton variante="secundario" className="boton-desplazar" disabled={ocupado || (sentido === -1 ? posicion === 0 : posicion === total - 1)} aria-label={`${texto} ${cliente}`}
    onPointerDown={(e) => { if (e.button === 0) iniciar(e.currentTarget); }}
    onKeyDown={() => { ignorarClick.current = false; }}
    onContextMenu={(e) => { e.preventDefault(); }}
    onClick={() => { if (ignorarClick.current) { ignorarClick.current = false; return; } mover(posicion + sentido); }}
  >{sentido === -1 ? '↑ SUBIR' : '↓ BAJAR'}</Boton>;
};
