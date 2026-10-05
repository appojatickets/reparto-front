import { direccionParaBuscar } from '../../domain/direccion-busqueda';
import { err, type Result } from '../../domain/result';
import type { CandidatoDireccion, ErrorGeocodificador, Geocodificador } from '../ports/geocodificador';

/**
 * Busca en el mapa la dirección que dice la factura (limpia de parcela, sitio, S/N…) con su comuna, y devuelve los lugares posibles para
 * que el chofer elija el correcto. Si la dirección no tiene una calle reconocible, ni siquiera sale a buscar.
 */
export const crearBuscarDireccion = ({ geocodificador }: { geocodificador: Geocodificador }) =>
  (direccion: string, comuna: string): Promise<Result<readonly CandidatoDireccion[], ErrorGeocodificador>> => {
    const calle = direccionParaBuscar(direccion);
    if (calle === undefined) return Promise.resolve(err('SIN_RESULTADO'));
    return geocodificador.buscarDirecciones(`${calle}, ${comuna}, Región Metropolitana, Chile`);
  };
