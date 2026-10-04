import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Result } from '../../../domain/result';
import type { UsuarioSesion } from '../../../application/modelos';
import { useCasos } from './contexto';

export const EVENTO_SESION_EXPIRADA = 'reparto:sesion-expirada';

export type EstadoSesionUI =
  | { readonly tipo: 'cargando' }
  | { readonly tipo: 'sin_sesion' }
  | { readonly tipo: 'sin_conexion' }
  | { readonly tipo: 'sesion'; readonly usuario: UsuarioSesion };

type ValorSesion = {
  readonly estado: EstadoSesionUI;
  readonly entrar: (username: string, pin: string) => Promise<Result<UsuarioSesion, string>>;
  readonly salir: () => void;
  readonly reintentar: () => void;
};

const Contexto = createContext<ValorSesion | undefined>(undefined);

export const ProveedorSesion = ({ children }: { readonly children: ReactNode }) => {
  const { restaurarSesion, iniciarSesion, cerrarSesion } = useCasos();
  const [estado, setEstado] = useState<EstadoSesionUI>({ tipo: 'cargando' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    void restaurarSesion().then((e) => {
      if (vigente) setEstado(e);
    });
    return () => {
      vigente = false;
    };
  }, [restaurarSesion, intento]);

  // La API avisa por este evento cuando el servidor rechaza también la renovación: hay que volver a entrar.
  useEffect(() => {
    const alExpirar = (): void => {
      setEstado({ tipo: 'sin_sesion' });
    };
    window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
    return () => {
      window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
    };
  }, []);

  const entrar = useCallback(
    async (username: string, pin: string) => {
      const r = await iniciarSesion(username, pin);
      if (r.ok) setEstado({ tipo: 'sesion', usuario: r.value });
      return r;
    },
    [iniciarSesion],
  );
  const salir = useCallback(() => {
    cerrarSesion();
    setEstado({ tipo: 'sin_sesion' });
  }, [cerrarSesion]);
  const reintentar = useCallback(() => {
    setEstado({ tipo: 'cargando' });
    setIntento((n) => n + 1);
  }, []);

  const valor = useMemo(() => ({ estado, entrar, salir, reintentar }), [estado, entrar, salir, reintentar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
};

export const useSesion = (): ValorSesion => {
  const v = useContext(Contexto);
  if (!v) throw new Error('Falta ProveedorSesion');
  return v;
};

/** Usuario ya autenticado (solo dentro de rutas protegidas). */
export const useUsuario = (): UsuarioSesion => {
  const { estado } = useSesion();
  if (estado.tipo !== 'sesion') throw new Error('Ruta sin sesión');
  return estado.usuario;
};
