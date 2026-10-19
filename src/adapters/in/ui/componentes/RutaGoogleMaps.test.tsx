import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ParadaDeRuta } from '../../../../application/modelos';
import { RutaGoogleMaps } from './RutaGoogleMaps';
const parada = (n: number): ParadaDeRuta => ({ facturaId: `f${n}`, localId: `l${n}`, cliente: `Local ${n}`, direccion: `Calle ${n} 100`, comuna: 'Pirque', urgente: false, posicion: n - 1, llegada: 600, inicioServicio: 600, salida: 605, espera: 0, atraso: 0, motivos: [], fijada: false });
const puntos = (href: string | null): (string | null)[] => {
  const url = new URL(href ?? 'https://invalid.test');
  return [...(url.searchParams.get('waypoints')?.split('|') ?? []), url.searchParams.get('destination')];
};
describe('tramo exacto que se envía a Google Maps', () => {
  it('mantiene compacto el editor y permite revisar las 9 paradas y la alternativa corta', async () => {
    render(<RutaGoogleMaps paradas={Array.from({ length: 12 }, (_, i) => parada(i + 1))} />);
    expect(screen.queryByRole('link')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'ABRIR RUTA EN GOOGLE MAPS' }));
    const largo = screen.getByRole('link', { name: 'LAS PRÓXIMAS 9 EN GOOGLE MAPS' });
    expect(puntos(largo.getAttribute('href'))).toEqual(Array.from({ length: 9 }, (_, i) => `Calle ${i + 1} 100, Pirque, Chile`));
    await userEvent.click(screen.getByText('VER LAS PARADAS QUE SE ENVIARÁN'));
    expect(screen.getByText('Local 9')).toBeInTheDocument();
    expect(screen.queryByText('Local 10')).toBeNull();
    await userEvent.click(screen.getByText('¿GOOGLE MUESTRA MENOS PARADAS?'));
    expect(puntos(screen.getByRole('link', { name: 'ABRIR SOLO LAS PRÓXIMAS 4' }).getAttribute('href'))).toHaveLength(4);
  });
  it('cambiar el orden o completar una entrega actualiza el enlace que se abre después', async () => {
    const { rerender } = render(<RutaGoogleMaps paradas={[parada(1), parada(2), parada(3)]} />);
    await userEvent.click(screen.getByRole('button', { name: 'ABRIR RUTA EN GOOGLE MAPS' }));
    rerender(<RutaGoogleMaps paradas={[parada(3), parada(2), parada(1)]} />);
    expect(puntos(screen.getByRole('link', { name: 'LAS PRÓXIMAS 3 EN GOOGLE MAPS' }).getAttribute('href'))).toEqual([3, 2, 1].map((n) => `Calle ${n} 100, Pirque, Chile`));
    rerender(<RutaGoogleMaps paradas={[parada(2), parada(1)]} />);
    expect(puntos(screen.getByRole('link', { name: 'LAS PRÓXIMAS 2 EN GOOGLE MAPS' }).getAttribute('href'))).toEqual([2, 1].map((n) => `Calle ${n} 100, Pirque, Chile`));
    rerender(<RutaGoogleMaps paradas={[]} />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});
