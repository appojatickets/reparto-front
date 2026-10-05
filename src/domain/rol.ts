export type Rol = 'admin' | 'despachador' | 'chofer' | 'ayudante';

export type Accion =
  | 'mi-ruta'
  | 'cargar-facturas'
  | 'buscar-clientes'
  | 'cliente-nuevo'
  | 'revisar-pines'
  | 'importar-clientes'
  | 'usuarios'
  | 'facturas'
  | 'rutas'
  | 'camiones'
  | 'vendedores'
  | 'exportar'
  | 'configuracion';

/**
 * Qué muestra el menú a cada rol. Es solo presentación: la API aplica los permisos de verdad (y responde 403);
 * esto evita ofrecer botones que fallarían.
 */
const ACCIONES: Readonly<Record<Rol, readonly Accion[]>> = {
  chofer: ['mi-ruta', 'cargar-facturas'],
  ayudante: ['mi-ruta', 'cargar-facturas'],
  despachador: ['facturas', 'rutas', 'buscar-clientes', 'cliente-nuevo', 'revisar-pines'],
  admin: ['facturas', 'rutas', 'buscar-clientes', 'cliente-nuevo', 'revisar-pines', 'importar-clientes', 'camiones', 'vendedores', 'exportar', 'configuracion', 'usuarios'],
};

export const accionesDe = (rol: Rol): readonly Accion[] => ACCIONES[rol];
export const puedeHacer = (rol: Rol, accion: Accion): boolean => ACCIONES[rol].includes(accion);

/** Chofer y ayudante van en el camión: ven su ruta, cargan entregas y avisan desde la parada. */
export const esDeCamion = (rol: Rol): boolean => rol === 'chofer' || rol === 'ayudante';
