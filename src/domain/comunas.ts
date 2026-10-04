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
