import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BotonDesplazar } from './BotonDesplazar';

afterEach(() => { vi.useRealTimers(); });
describe('mover con pulsación mantenida', () => {
  it('previsualiza rápido y confirma una sola posición al soltar', () => {
    vi.useFakeTimers();
    const mover = vi.fn();
    render(<BotonDesplazar cliente="Local" posicion={0} total={20} sentido={1} ocupado={false} mover={mover} />);
    fireEvent.pointerDown(screen.getByRole('button'), { button: 0 });
    act(() => { vi.advanceTimersByTime(1500); });
    expect(mover.mock.calls.filter((c) => c[1] === true).length).toBeGreaterThan(6);
    expect(mover.mock.calls.every((c) => c[1] === true)).toBe(true);
    fireEvent.pointerUp(window);
    expect(mover.mock.calls.filter((c) => c[1] === false && c[2] === false)).toHaveLength(1);
    const cantidad = mover.mock.calls.length;
    act(() => { vi.advanceTimersByTime(1000); });
    expect(mover).toHaveBeenCalledTimes(cantidad);
  });
  it('cancelar restaura la posición inicial sin guardar el recorrido intermedio', () => {
    vi.useFakeTimers();
    const mover = vi.fn();
    render(<BotonDesplazar cliente="Local" posicion={10} total={20} sentido={-1} ocupado={false} mover={mover} />);
    fireEvent.pointerDown(screen.getByRole('button'), { button: 0 });
    act(() => { vi.advanceTimersByTime(700); });
    fireEvent.pointerCancel(window);
    expect(mover).toHaveBeenLastCalledWith(10, false, true);
  });
  it('un click de teclado mueve una posición y los extremos quedan deshabilitados', () => {
    const mover = vi.fn();
    const { rerender } = render(<BotonDesplazar cliente="Local" posicion={3} total={5} sentido={-1} ocupado={false} mover={mover} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mover).toHaveBeenCalledWith(2);
    rerender(<BotonDesplazar cliente="Local" posicion={0} total={5} sentido={-1} ocupado={false} mover={mover} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
