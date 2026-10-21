import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ok } from '../../../../domain/result';
import type { VistaRuta } from '../../../../application/modelos';
import { OrganizacionRuta } from './OrganizacionRuta';
const api = vi.hoisted(() => ({ verRuta: vi.fn(), planificarRuta: vi.fn() }));
const armado = vi.hoisted(() => ({ cargar: () => undefined, guardar: vi.fn() }));
vi.mock('../contexto', () => ({ useCasos: () => ({ api, armado }) }));
const vista: VistaRuta = { camionId: 'c1', fecha: '2026-10-05', planificada: false, salidaMin: 480, horaLimiteRegresoMin: 1260, paradas: [], nuevas: [], hechas: [], sinPin: [], noAtendidas: [], enRiesgo: [] };
const jornada = { id: 'j1', fecha: vista.fecha, desde: '', camion: { id: 'c1', patente: 'AB1234' } };
describe('organización antes de cargar', () => {
  it('exige elegir modo y guarda el orden de comunas antes de habilitar la carga', async () => {
    api.verRuta.mockResolvedValue(ok(vista)); api.planificarRuta.mockResolvedValue(ok({ ...vista, planificada: true, version: 1 }));
    const preparada = vi.fn();
    render(<OrganizacionRuta jornada={jornada} alPreparada={preparada} />);
    const guardar = await screen.findByRole('button', { name: 'GUARDAR ORGANIZACIÓN' });
    expect(guardar).toBeDisabled(); expect(preparada).toHaveBeenLastCalledWith(false);
    await userEvent.selectOptions(screen.getByLabelText('Cómo cargarás las facturas'), 'calcular');
    await userEvent.selectOptions(screen.getByLabelText('Añadir comuna al orden de entrega'), 'Maipú');
    await userEvent.selectOptions(screen.getByLabelText('Añadir comuna al orden de entrega'), 'San Bernardo');
    await userEvent.click(guardar);
    expect(api.planificarRuta).toHaveBeenCalledWith('c1', '2026-10-05', undefined, 'calcular', ['Maipú', 'San Bernardo']);
    expect(preparada).toHaveBeenLastCalledWith(true);
  });
});
