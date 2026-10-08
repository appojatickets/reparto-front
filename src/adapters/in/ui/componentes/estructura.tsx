import { Link, Navigate, Outlet, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { puedeHacer, type Accion } from '../../../../domain/rol';
import { useSesion } from '../sesion';
import { CambiarTema } from '../tema';
import { CambiarVista } from '../vista';
import { PermisosAlAbrir } from './PermisosAlAbrir';
import { SeguimientoDelCamion } from './SeguimientoDelCamion';
import { Boton, Cargando, Pagina, Aviso } from './ui';

const ETIQUETA_ROL = { admin: 'Administración', despachador: 'Despacho', chofer: 'Chofer', ayudante: 'Ayudante' } as const;

/** Cabecera común: quién eres y SALIR siempre a mano. */
export const Marco = () => {
  const { estado, salir } = useSesion();
  const { pathname } = useLocation();
  if (estado.tipo !== 'sesion') return null;
  return (
    <>
      <header className="cabecera">
        <div>
          <strong>{estado.usuario.nombre}</strong>
          <span className="rol"> · {ETIQUETA_ROL[estado.usuario.rol]}</span>
        </div>
        <div className="fila-botones">
          <CambiarVista />
          <CambiarTema />
          <Boton variante="secundario" onClick={salir}>SALIR</Boton>
        </div>
      </header>
      <main className="screen">
        <PermisosAlAbrir />
        {estado.usuario.rol === 'chofer' || estado.usuario.rol === 'ayudante' ? <SeguimientoDelCamion /> : null}
        {pathname !== '/' ? <Link className="volver" to="/">← INICIO</Link> : null}
        <Outlet />
      </main>
    </>
  );
};

/** Exige sesión y, si se indica, que el rol pueda hacer esa acción (la API vuelve a comprobarlo con un 403). */
export const RutaProtegida = ({ accion, children }: { readonly accion?: Accion; readonly children: ReactNode }) => {
  const { estado, reintentar } = useSesion();
  const ubicacion = useLocation();
  switch (estado.tipo) {
    case 'cargando':
      return <main className="screen"><Cargando texto="Entrando…" /></main>;
    case 'sin_conexion':
      return (
        <main className="screen">
          <Pagina titulo="Sin conexión">
            <Aviso tipo="error">No hay señal para verificar tu sesión.</Aviso>
            <Boton onClick={reintentar}>REINTENTAR</Boton>
          </Pagina>
        </main>
      );
    case 'sin_sesion':
      return <Navigate to="/entrar" replace state={{ desde: ubicacion.pathname }} />;
    case 'sesion':
      return accion && !puedeHacer(estado.usuario.rol, accion, estado.usuario.editor) ? <Navigate to="/" replace /> : <>{children}</>;
  }
};

export { Outlet };
