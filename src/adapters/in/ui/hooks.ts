import { useCallback, useEffect, useState } from 'react';
import type { Result } from '../../../domain/result';
import type { ApiError } from '../../../application/ports/api-client';

export type EstadoCarga<T> =
  | { readonly tipo: 'cargando' }
  | { readonly tipo: 'ok'; readonly datos: T }
  | { readonly tipo: 'error'; readonly error: ApiError };

/** Carga datos al entrar. `cargar` debe estar memorizada con useCallback (cambia → vuelve a cargar). */
export function useCarga<T>(cargar: () => Promise<Result<T, ApiError>>) {
  const [estado, setEstado] = useState<EstadoCarga<T>>({ tipo: 'cargando' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    void cargar().then((r) => {
      if (vigente) setEstado(r.ok ? { tipo: 'ok', datos: r.value } : { tipo: 'error', error: r.error });
    });
    return () => {
      vigente = false;
    };
  }, [cargar, version]);

  /** Vuelve a cargar mostrando «Cargando…». */
  const recargar = useCallback(() => {
    setEstado({ tipo: 'cargando' });
    setVersion((v) => v + 1);
  }, []);
  /** Vuelve a cargar sin tocar la pantalla (no pierde lo que la persona está escribiendo ni los mensajes). */
  const refrescar = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);
  return { estado, recargar, refrescar };
}

export function useDebounced<T>(valor: T, ms: number): T {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => {
      setV(valor);
    }, ms);
    return () => {
      clearTimeout(id);
    };
  }, [valor, ms]);
  return v;
}
