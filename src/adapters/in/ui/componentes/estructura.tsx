import { useCasos } from '../contexto';
import { MapaGuardadoOffline } from './MapaRuta';
import { Link, Navigate, Outlet, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { ETIQUETA_ROL, esDeCamion, puedeEditar, puedeHacer, type Accion } from '../../../../domain/rol';
import { useSesion } from '../sesion';
import { CambiarTema } from '../tema';
import { CambiarVista } from '../vista';
import { Avatar } from './Avatar';
import { KitEmergencia } from './KitEmergencia';
import { PermisosAlAbrir } from './PermisosAlAbrir';
import { SeguimientoDelCamion } from './SeguimientoDelCamion';
import { Boton, Cargando, Pagina, Aviso } from './ui';

/** Cabecera común: quién eres y SALIR siempre a mano. */
export const Marco = () => {
  const { estado, salir } = useSesion();
  const { seguimientoNativo } = useCasos();
  const { pathname } = useLocation();
  if (estado.tipo !== 'sesion') return null;
  const simple = esDeCamion(estado.usuario.rol) && !puedeEditar(estado.usuario.rol, estado.usuario.editor);
  return (
    <>
      <header className="cabecera">
        <Link className="quien" to="/perfil" aria-label={`Mi perfil: ${estado.usuario.nombre}, ${ETIQUETA_ROL[estado.usuario.rol]}`}>
          <Avatar usuarioId={estado.usuario.id} nombre={estado.usuario.nombre} fotoEn={estado.usuario.fotoEn} />
          <span>
            <strong>{estado.usuario.nombre}</strong>
            <span className="rol"> · {ETIQUETA_ROL[estado.usuario.rol]}</span>
          </span>
        </Link>
        <details className="cuenta-simple" open={simple ? undefined : true}>
          <summary>MI CUENTA</summary>
          <div className="fila-botones">
          <Link className="volver" to="/perfil">EDITAR MI PERFIL</Link>
          <CambiarVista />
          <CambiarTema />
          <Boton variante="secundario" onClick={salir}>SALIR</Boton>
        </div>
        </details>
      </header>
      <main className="screen">
        {!simple ? <PermisosAlAbrir /> : null}
        {esDeCamion(estado.usuario.rol) ? simple ? <details className="opciones-simples"><summary>EMERGENCIA</summary><KitEmergencia /></details> : <KitEmergencia /> : null}
        {estado.usuario.rol === 'chofer' || estado.usuario.rol === 'ayudante' ? <SeguimientoDelCamion simple={simple} /> : null}
        {pathname !== '/' ? <Link className="volver" to="/">← INICIO</Link> : null}
        <Outlet />
        {/* Para saber si el teléfono ya tiene la última versión publicada (es el commit que Vercel desplegó). */}
        {!seguimientoNativo ? <Link className="volver" to="/android">DESCARGAR APP ANDROID</Link> : null}
        <p className="ayuda version-app">Versión de la app: {__VERSION__}</p>
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
            <MapaGuardadoOffline />
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
