import { Link } from 'react-router';
import { accionesDe, type Accion } from '../../../../domain/rol';
import { Pagina } from '../componentes/ui';
import { useUsuario } from '../sesion';
import { InicioChofer } from './InicioChofer';

const ENTRADAS: Partial<Record<Accion, { readonly a: string; readonly texto: string }>> = {
  facturas: { a: '/facturas', texto: 'FACTURAS DEL DÍA' },
  rutas: { a: '/rutas', texto: 'RUTAS DEL DÍA' },
  'buscar-clientes': { a: '/clientes', texto: 'BUSCAR CLIENTE' },
  'cliente-nuevo': { a: '/clientes/nuevo', texto: 'CLIENTE NUEVO' },
  'revisar-pines': { a: '/pines', texto: 'PINES DE LOCALES' },
  'importar-clientes': { a: '/admin/importar', texto: 'IMPORTAR CLIENTES' },
  configuracion: { a: '/admin/configuracion', texto: 'CONFIGURACIÓN' },
  camiones: { a: '/admin/camiones', texto: 'CAMIONES' },
  exportar: { a: '/admin/exportar', texto: 'EXPORTAR DATOS' },
  fotos: { a: '/admin/fotos', texto: 'REVISAR FOTOS' },
  vendedores: { a: '/admin/vendedores', texto: 'VENDEDORES' },
  usuarios: { a: '/admin/usuarios', texto: 'USUARIOS' },
};

export const PaginaInicio = () => {
  const usuario = useUsuario();
  const acciones = accionesDe(usuario.rol);
  const enlaces = acciones.flatMap((a) => {
    const e = ENTRADAS[a];
    return e ? [e] : [];
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
