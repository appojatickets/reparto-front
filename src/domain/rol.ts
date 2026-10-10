export type Rol = 'admin' | 'despachador' | 'chofer' | 'ayudante';

export type Accion =
  | 'mi-ruta'
  | 'cargar-facturas'
  | 'buscar-clientes'
  | 'cliente-nuevo'
  | 'revisar-pines'
  | 'verificar-pines'
  | 'locales'
  | 'importar-clientes'
  | 'usuarios'
  | 'facturas'
  | 'rutas'
  | 'camiones'
  | 'vendedores'
  | 'planilla'
  | 'exportar'
  | 'fotos'
  | 'reportes'
  | 'analitica'
  | 'configuracion';

export const ETIQUETA_ROL: Readonly<Record<Rol, string>> = { admin: 'Administración', despachador: 'Despacho', chofer: 'Chofer', ayudante: 'Ayudante' };

/** Chofer y ayudante van en el camión: ven su ruta, cargan entregas y avisan desde la parada. */
export const esDeCamion = (rol: Rol): boolean => rol === 'chofer' || rol === 'ayudante';

/**
 * Qué muestra el menú a cada rol. Es solo presentación: la API aplica los permisos de verdad (y responde 403);
 * esto evita ofrecer botones que fallarían.
 */
const ACCIONES: Readonly<Record<Rol, readonly Accion[]>> = {
  chofer: ['mi-ruta', 'cargar-facturas'],
  ayudante: ['mi-ruta', 'cargar-facturas'],
  despachador: ['facturas', 'rutas', 'planilla', 'buscar-clientes', 'cliente-nuevo', 'locales', 'verificar-pines', 'revisar-pines', 'reportes'],
  admin: ['facturas', 'rutas', 'planilla', 'buscar-clientes', 'cliente-nuevo', 'locales', 'verificar-pines', 'revisar-pines', 'importar-clientes', 'camiones', 'vendedores', 'exportar', 'reportes', 'fotos', 'analitica', 'configuracion', 'usuarios'],
};

/** Lo que suma el permiso de editor (lo da el admin) a quien va en el camión: buscar una dirección para corregirla, verificar pines y editar los locales por comuna. */
const ACCIONES_DE_EDITOR: readonly Accion[] = ['buscar-clientes', 'verificar-pines', 'locales'];

export const accionesDe = (rol: Rol, editor = false): readonly Accion[] =>
  editor && esDeCamion(rol) ? [...ACCIONES[rol], ...ACCIONES_DE_EDITOR] : ACCIONES[rol];
export const puedeHacer = (rol: Rol, accion: Accion, editor = false): boolean => accionesDe(rol, editor).includes(accion);

/** ¿Puede corregir lo mal cargado (nombre, foto, eliminar la dirección)? Admin y despachador siempre; chofer y ayudante solo con el permiso de editor. */
export const puedeEditar = (rol: Rol, editor: boolean): boolean => rol === 'admin' || rol === 'despachador' || (editor && esDeCamion(rol));
