import { normalizar } from './texto';
/** Las 52 comunas de la Región Metropolitana (el catálogo oficial vive también en la API, que es quien valida). */
export const COMUNAS_RM: readonly string[] = [
  'Alhué', 'Buin', 'Calera de Tango', 'Cerrillos', 'Cerro Navia', 'Colina', 'Conchalí', 'Curacaví', 'El Bosque', 'El Monte',
  'Estación Central', 'Huechuraba', 'Independencia', 'Isla de Maipo', 'La Cisterna', 'La Florida', 'La Granja', 'La Pintana',
  'La Reina', 'Lampa', 'Las Condes', 'Lo Barnechea', 'Lo Espejo', 'Lo Prado', 'Macul', 'Maipú', 'María Pinto', 'Melipilla',
  'Ñuñoa', 'Padre Hurtado', 'Paine', 'Pedro Aguirre Cerda', 'Peñaflor', 'Peñalolén', 'Pirque', 'Providencia', 'Pudahuel',
  'Puente Alto', 'Quilicura', 'Quinta Normal', 'Recoleta', 'Renca', 'San Bernardo', 'San Joaquín', 'San José de Maipo',
  'San Miguel', 'San Pedro', 'San Ramón', 'Santiago', 'Talagante', 'Tiltil', 'Vitacura',
];

const COMUNAS_NORMALIZADAS: readonly { readonly nombre: string; readonly tokens: readonly string[] }[] = COMUNAS_RM
  .map((nombre) => ({ nombre, tokens: normalizar(nombre).split(' ') }))
  .sort((a, b) => b.tokens.length - a.tokens.length);

/**
 * Si el texto termina con el nombre de una comuna («Av. Colón 765 San Bernardo»), la separa y devuelve el resto como dirección.
 * Solo cuenta al final y si queda algo antes: así «Av. Providencia 2500» no se toma por la comuna Providencia.
 */
export const separarComuna = (texto: string): { readonly consulta: string; readonly comuna?: string } => {
  const original = texto.trim().split(/\s+/).filter((t) => t !== '');
  const normales = original.map(normalizar);
  for (const c of COMUNAS_NORMALIZADAS) {
    const n = c.tokens.length;
    if (original.length <= n) continue;
    const cola = normales.slice(-n);
    if (cola.every((t, i) => t === c.tokens[i])) {
      return { consulta: original.slice(0, -n).join(' ').replace(/[,;]+$/u, '').trim(), comuna: c.nombre };
    }
  }
  return { consulta: original.join(' ') };
};

/** Centro aproximado de cada comuna (solo sirve para estimar la comuna de un pin; no es un límite). */
const CENTROS: Readonly<Record<string, readonly [number, number]>> = {
  'Alhué': [-34.04, -71.09], Buin: [-33.73, -70.74], 'Calera de Tango': [-33.63, -70.78], Cerrillos: [-33.5, -70.72], 'Cerro Navia': [-33.42, -70.74],
  Colina: [-33.2, -70.67], 'Conchalí': [-33.38, -70.68], 'Curacaví': [-33.4, -71.14], 'El Bosque': [-33.56, -70.68], 'El Monte': [-33.68, -70.98],
  'Estación Central': [-33.46, -70.68], Huechuraba: [-33.36, -70.64], Independencia: [-33.42, -70.66], 'Isla de Maipo': [-33.75, -70.9],
  'La Cisterna': [-33.53, -70.66], 'La Florida': [-33.52, -70.58], 'La Granja': [-33.54, -70.63], 'La Pintana': [-33.59, -70.63], 'La Reina': [-33.44, -70.54],
  Lampa: [-33.29, -70.88], 'Las Condes': [-33.41, -70.57], 'Lo Barnechea': [-33.35, -70.52], 'Lo Espejo': [-33.52, -70.69], 'Lo Prado': [-33.44, -70.72],
  Macul: [-33.49, -70.6], 'Maipú': [-33.51, -70.76], 'María Pinto': [-33.52, -71.12], Melipilla: [-33.69, -71.21], 'Ñuñoa': [-33.46, -70.6],
  'Padre Hurtado': [-33.57, -70.82], Paine: [-33.81, -70.74], 'Pedro Aguirre Cerda': [-33.49, -70.67], 'Peñaflor': [-33.61, -70.88], 'Peñalolén': [-33.49, -70.53],
  Pirque: [-33.67, -70.58], Providencia: [-33.43, -70.61], Pudahuel: [-33.44, -70.76], 'Puente Alto': [-33.61, -70.58], Quilicura: [-33.36, -70.73],
  'Quinta Normal': [-33.43, -70.7], Recoleta: [-33.4, -70.64], Renca: [-33.4, -70.72], 'San Bernardo': [-33.59, -70.7], 'San Joaquín': [-33.5, -70.62],
  'San José de Maipo': [-33.64, -70.35], 'San Miguel': [-33.5, -70.65], 'San Pedro': [-33.9, -71.46], 'San Ramón': [-33.54, -70.64], Santiago: [-33.45, -70.66],
  Talagante: [-33.66, -70.93], Tiltil: [-33.08, -70.93], Vitacura: [-33.38, -70.57],
};

/** Distancia en línea recta entre dos puntos (lat, lng), en km. */
export const distanciaKm = (a: readonly [number, number], b: readonly [number, number]): number => kmEntre(a, b);

const kmEntre = (a: readonly [number, number], b: readonly [number, number]): number => {
  const r = (g: number): number => (g * Math.PI) / 180;
  const h = Math.sin((r(b[0]) - r(a[0])) / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin((r(b[1]) - r(a[1])) / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
};

/**
 * Estima la comuna de un pin por el centro más cercano. Solo la da por segura si el segundo centro queda al menos al doble de distancia;
 * si no (el pin está entre dos comunas), devuelve las dos más cercanas como sugerencia para que alguien elija.
 */
export const comunaDelPin = (lat: number, lng: number): { readonly comuna?: string; readonly sugerencias: readonly string[] } => {
  const orden = Object.entries(CENTROS)
    .map(([nombre, centro]) => ({ nombre, km: kmEntre([lat, lng], centro) }))
    .sort((a, b) => a.km - b.km);
  const [primera, segunda] = orden;
  if (!primera || !segunda) return { sugerencias: [] };
  const segura = primera.km <= segunda.km * 0.5;
  return { ...(segura ? { comuna: primera.nombre } : {}), sugerencias: [primera.nombre, segunda.nombre] };
};
