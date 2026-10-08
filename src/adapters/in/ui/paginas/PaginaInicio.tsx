import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { accionesDe, type Accion } from '../../../../domain/rol';
import { Pagina } from '../componentes/ui';
import { useCasos } from '../contexto';
import { useUsuario } from '../sesion';
import { InicioChofer } from './InicioChofer';

const ENTRADAS: Partial<Record<Accion, { readonly a: string; readonly texto: string }>> = {
  facturas: { a: '/facturas', texto: 'FACTURAS DEL DÍA' },
  rutas: { a: '/rutas', texto: 'RUTAS DEL DÍA' },
  'buscar-clientes': { a: '/clientes', texto: 'BUSCAR CLIENTE' },
  'cliente-nuevo': { a: '/clientes/nuevo', texto: 'CLIENTE NUEVO' },
  locales: { a: '/locales', texto: 'LOCALES POR COMUNA' },
  'verificar-pines': { a: '/pines/verificar', texto: 'VERIFICAR PINES' },
  'revisar-pines': { a: '/pines', texto: 'PROPUESTAS DE PIN' },
  'importar-clientes': { a: '/admin/importar', texto: 'IMPORTAR CLIENTES' },
  configuracion: { a: '/admin/configuracion', texto: 'CONFIGURACIÓN' },
  camiones: { a: '/admin/camiones', texto: 'CAMIONES' },
  exportar: { a: '/admin/exportar', texto: 'EXPORTAR DATOS' },
  reportes: { a: '/admin/reportes', texto: 'REPORTES' },
  fotos: { a: '/admin/fotos', texto: 'REVISAR FOTOS' },
  analitica: { a: '/admin/analitica', texto: 'ANALÍTICA' },
  vendedores: { a: '/admin/vendedores', texto: 'VENDEDORES' },
  usuarios: { a: '/admin/usuarios', texto: 'USUARIOS' },
};

/** Cuántos reportes hay sin resolver, para avisarlo en el inicio. Si no se puede leer, no se muestra nada. */
const useCuentaDeReportes = (activo: boolean): number | undefined => {
  const { api } = useCasos();
  const [n, setN] = useState<number | undefined>();
  useEffect(() => {
    if (!activo) return;
    const vigente = { activo: true };
    void (async () => {
      try {
        const r = await api.verReportes();
        if (vigente.activo && r.ok) setN(r.value.total);
      } catch {
        // El contador es un aviso: si falla, el inicio se ve igual.
      }
    })();
    return () => { vigente.activo = false; };
  }, [api, activo]);
  return n;
};

export const PaginaInicio = () => {
  const usuario = useUsuario();
  const acciones = accionesDe(usuario.rol, usuario.editor);
  const pendientes = useCuentaDeReportes(acciones.includes('reportes'));
  const enlaces = acciones.flatMap((a) => {
    const e = ENTRADAS[a];
    return e ? [a === 'reportes' && pendientes !== undefined && pendientes > 0 ? { ...e, texto: `${e.texto} (${String(pendientes)})` } : e] : [];
  });
  return (
    <Pagina titulo={`Hola, ${usuario.nombre.split(' ')[0] ?? usuario.nombre}`}>
      {acciones.includes('mi-ruta') ? <InicioChofer /> : null}
      {enlaces.length > 0 ? (
        <ul className="menu">
          {enlaces.map((e) => (
            <li key={e.a}><Link to={e.a}>{e.texto}</Link></li>
          ))}
        </ul>
      ) : null}
    </Pagina>
  );
};
