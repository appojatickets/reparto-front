import { describe, expect, it, vi } from 'vitest';
import { err, ok } from '../../domain/result';
import type { Geocodificador } from '../ports/geocodificador';
import { crearBuscarDireccion } from './buscar-direccion';

const armar = (respuesta: ReturnType<Geocodificador['buscarDirecciones']>) => {
  const buscarDirecciones = vi.fn<Geocodificador['buscarDirecciones']>(() => respuesta);
  return { buscarDirecciones, caso: crearBuscarDireccion({ geocodificador: { comunaDe: vi.fn(), buscarDirecciones } }) };
};

describe('buscar la dirección de una factura en el mapa', () => {
  it('busca la calle limpia con la comuna y devuelve los lugares posibles', async () => {
    const lugar = { lat: -33.6, lng: -70.7, etiqueta: 'Avenida Colón Sur 765, San Bernardo', precision: 'exacta' as const, comuna: 'San Bernardo' };
    const { caso, buscarDirecciones } = armar(Promise.resolve(ok([lugar])));
    expect(await caso('AV COLON SUR 765', 'San Bernardo')).toEqual({ ok: true, value: [lugar] });
    expect(buscarDirecciones).toHaveBeenCalledWith('Avenida COLON SUR 765, San Bernardo, Región Metropolitana, Chile');
  });

  it('una dirección sin calle reconocible no sale a buscar', async () => {
    const { caso, buscarDirecciones } = armar(Promise.resolve(ok([])));
    expect(await caso('Parcela 7 Sitio 3', 'Paine')).toEqual({ ok: false, error: 'SIN_RESULTADO' });
    expect(buscarDirecciones).not.toHaveBeenCalled();
  });

  it('pasa los errores del servicio tal cual', async () => {
    const { caso } = armar(Promise.resolve(err('LIMITE' as const)));
    expect(await caso('Calle Alameda 114', 'Pirque')).toEqual({ ok: false, error: 'LIMITE' });
  });
});
