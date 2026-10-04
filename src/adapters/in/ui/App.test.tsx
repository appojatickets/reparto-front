import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import type { CheckServer } from './use-server-status';

describe('App', () => {
  it('muestra «despertando servidor» mientras tarda', async () => {
    const check: CheckServer = (_signal, onStatus) => {
      onStatus({ kind: 'waking' });
      return new Promise(() => undefined);
    };
    render(<App checkServer={check} />);
    expect(await screen.findByRole('status')).toHaveTextContent('Despertando servidor');
  });

  it('muestra «Servidor listo» sin botón de reintento', async () => {
    const check: CheckServer = (_s, onStatus) => {
      onStatus({ kind: 'ok' });
      return Promise.resolve({ kind: 'ok' });
    };
    render(<App checkServer={check} />);
    expect(await screen.findByText('Servidor listo')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('sin conexión ofrece REINTENTAR y vuelve a consultar', async () => {
    const check = vi.fn<CheckServer>((_s, onStatus) => {
      onStatus({ kind: 'unreachable' });
      return Promise.resolve({ kind: 'unreachable' });
    });
    render(<App checkServer={check} />);
    await userEvent.click(await screen.findByRole('button', { name: 'REINTENTAR' }));
    expect(check).toHaveBeenCalledTimes(2);
  });
});
