export type Rol = 'admin' | 'despachador' | 'chofer';

export type Accion =
  | 'mi-ruta'
  | 'buscar-clientes'
  | 'cliente-nuevo'
  | 'revisar-pines'
  | 'importar-clientes'
  | 'usuarios'
  | 'facturas'
  | 'camiones';

/**
 * Qué muestra el menú a cada rol. Es solo presentación: la API aplica los permisos de verdad (y responde 403);
 * esto evita ofrecer botones que fallarían.
 */
const ACCIONES: Readonly<Record<Rol, readonly Accion[]>> = {
  chofer: ['mi-ruta'],
  despachador: ['facturas', 'buscar-clientes', 'cliente-nuevo', 'revisar-pines'],
  admin: ['facturas', 'buscar-clientes', 'cliente-nuevo', 'revisar-pines', 'importar-clientes', 'camiones', 'usuarios'],
};

export const accionesDe = (rol: Rol): readonly Accion[] => ACCIONES[rol];
export const puedeHacer = (rol: Rol, accion: Accion): boolean => ACCIONES[rol].includes(accion);
