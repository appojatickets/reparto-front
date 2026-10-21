import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParadaDeRuta } from '../../../../application/modelos';
import { EditarOrdenMapa } from './EditarOrdenMapa';
const parada: ParadaDeRuta = { facturaId: 'f8', localId: 'l8', cliente: 'Almacén', direccion: 'O’Higgins 955', comuna: 'Maipú', urgente: false, posicion: 7, llegada: 480, inicioServicio: 480, salida: 490, espera: 0, atraso: 0, motivos: [], fijada: false };
beforeEach(() => { Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute('open', ''); } }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('cambiar directamente el número de una entrega', () => {
  it('salta del puesto 8 al 2 con un solo envío y cierra solo al confirmar', async () => {
    const guardar = vi.fn().mockResolvedValue(true); const cancelar = vi.fn();
    render(<EditarOrdenMapa parada={parada} total={12} manual={false} guardar={guardar} cancelar={cancelar} />);
    const input = screen.getByLabelText('Mover al puesto');
    await userEvent.clear(input); await userEvent.type(input, '2');
    await userEvent.click(screen.getByRole('button', { name: 'MOVER' }));
    expect(guardar).toHaveBeenCalledExactlyOnceWith(1); expect(cancelar).toHaveBeenCalledOnce();
  });
  it('valida posiciones y conserva el editor si el servidor no confirmó', async () => {
    const guardar = vi.fn().mockResolvedValue(false); const cancelar = vi.fn();
    render(<EditarOrdenMapa parada={parada} total={12} manual guardar={guardar} cancelar={cancelar} />);
    expect(screen.getByText('Se conserva el orden del resto de las entregas.')).toBeInTheDocument();
    const input = screen.getByLabelText('Mover al puesto');
    await userEvent.clear(input); await userEvent.type(input, '13');
    await userEvent.click(screen.getByRole('button', { name: 'MOVER' }));
    expect(guardar).not.toHaveBeenCalled();
    expect(screen.getByText('Elige un puesto entre 1 y 12.')).toBeInTheDocument();
    await userEvent.clear(input); await userEvent.type(input, '3');
    await userEvent.click(screen.getByRole('button', { name: 'MOVER' }));
    expect(await screen.findByText(/No se confirmó el cambio/)).toBeInTheDocument(); expect(cancelar).not.toHaveBeenCalled();
  });
});
