import type { VistaRuta, TrazadoMapa } from '../../../../application/modelos';
export type MapaGuardado = { readonly usuarioId: string; readonly vista: VistaRuta; readonly trazado: TrazadoMapa; readonly guardadoEn: string };
const CLAVE = 'reparto:mapa-guardado:v1';
/** Solo la última ruta descargada; sin tokens ni fotos. Se elimina al salir o cambiar de cuenta. */
export const guardarMapa = (datos: MapaGuardado): boolean => {
  try { localStorage.setItem(CLAVE, JSON.stringify(datos)); return true; } catch { return false; }
};
export const leerMapa = (usuarioId?: string): MapaGuardado | undefined => {
  try {
    const texto = localStorage.getItem(CLAVE);
    if (!texto) return undefined;
    const crudo: unknown = JSON.parse(texto);
    if (typeof crudo !== 'object' || crudo === null || !('vista' in crudo) || !('trazado' in crudo) || !('usuarioId' in crudo) || !('guardadoEn' in crudo)) return undefined;
    if (typeof crudo.usuarioId !== 'string' || typeof crudo.guardadoEn !== 'string' || !Number.isFinite(Date.parse(crudo.guardadoEn))) return undefined;
    const v = crudo.vista;
    if (typeof v !== 'object' || v === null || !('fecha' in v) || typeof v.fecha !== 'string' || !('camionId' in v) || typeof v.camionId !== 'string' || !('paradas' in v) || !Array.isArray(v.paradas)) return undefined;
    if (!v.paradas.every((p: unknown) => typeof p === 'object' && p !== null && 'facturaId' in p && typeof p.facturaId === 'string' && 'cliente' in p && typeof p.cliente === 'string' && 'direccion' in p && typeof p.direccion === 'string' && 'comuna' in p && typeof p.comuna === 'string' && (!('lat' in p) || (typeof p.lat === 'number' && Number.isFinite(p.lat))) && (!('lng' in p) || (typeof p.lng === 'number' && Number.isFinite(p.lng))))) return undefined;
    const t = crudo.trazado;
    if (typeof t !== 'object' || t === null || !('tramos' in t) || !Array.isArray(t.tramos)) return undefined;
    if (!t.tramos.every((tramo: unknown) => typeof tramo === 'object' && tramo !== null && 'porCalles' in tramo && typeof tramo.porCalles === 'boolean' && 'coordenadas' in tramo && Array.isArray(tramo.coordenadas) && tramo.coordenadas.every((p: unknown) => Array.isArray(p) && p.length === 2 && p.every((n: unknown) => typeof n === 'number' && Number.isFinite(n))))) return undefined;
    const datos = crudo as MapaGuardado;
    if (usuarioId !== undefined && datos.usuarioId !== usuarioId) return undefined;
    return datos;
  } catch { return undefined; }
};
export const borrarMapa = (): void => { try { localStorage.removeItem(CLAVE); } catch { /* almacenamiento bloqueado */ } };
