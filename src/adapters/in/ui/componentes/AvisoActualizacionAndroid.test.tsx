import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvisoActualizacionAndroid } from './AvisoActualizacionAndroid';
const fake = vi.hoisted(() => {
  const instalada = vi.fn();
  const publicada = vi.fn();
  const reloj = { momento: 1_000_000 };
  const casos: { versionAndroid: typeof instalada | undefined; consultarAndroid: typeof publicada; ahora: () => Date } = { versionAndroid: instalada, consultarAndroid: publicada, ahora: () => new Date(reloj.momento) };
  return { instalada, publicada, casos, reloj };
});
vi.mock('../contexto', () => ({ useCasos: () => fake.casos }));
const version = (n: number) => ({ tipo: 'lista', apk: { version: `android-v${n}`, url: `https://github.com/appojatickets/reparto-front/releases/download/android-v${n}/reparto.apk`, tamanoBytes: 4_000_000 } });
beforeEach(() => {
  vi.resetAllMocks();
  fake.reloj.momento = 1_000_000;
  fake.casos.versionAndroid = fake.instalada;
  fake.instalada.mockResolvedValue({ codigo: 10, paquete: 'cl.reparto.app' });
  fake.publicada.mockResolvedValue(version(11));
});
const evento = async (nombre: string): Promise<void> => {
  await act(() => { window.dispatchEvent(new Event(nombre)); return Promise.resolve(); });
};
describe('aviso de nueva versión al abrir Android', () => {
  it('ofrece el APK oficial y permite seguir trabajando; descargar no se marca como instalar', async () => {
    render(<><AvisoActualizacionAndroid /><button type="button">CONTINUAR REPARTO</button></>);
    const descarga = await screen.findByRole('link', { name: 'DESCARGAR ACTUALIZACIÓN' });
    expect(descarga).toHaveAttribute('href', version(11).apk.url);
    expect(screen.getByRole('button', { name: 'CONTINUAR REPARTO' })).toBeEnabled();
    expect(screen.getByText(/Instalada: v10. Disponible: v11/)).toBeInTheDocument();
  });
  it.each([9, 10])('no recomienda instalar la versión %s cuando ya está instalada la 10', async (n) => {
    fake.publicada.mockResolvedValue(version(n));
    render(<AvisoActualizacionAndroid />);
    await waitFor(() => { expect(fake.publicada).toHaveBeenCalledTimes(1); });
    expect(screen.queryByRole('link')).toBeNull();
  });
  it('Más tarde oculta solo esa versión hasta la próxima apertura, y una versión posterior vuelve a avisar', async () => {
    render(<AvisoActualizacionAndroid />);
    await userEvent.click(await screen.findByRole('button', { name: 'MÁS TARDE' }));
    expect(screen.queryByRole('link')).toBeNull();
    await evento('focus');
    expect(fake.publicada).toHaveBeenCalledTimes(1);
    fake.publicada.mockResolvedValue(version(12));
    fake.reloj.momento += 16 * 60_000;
    await evento('focus');
    expect(await screen.findByText(/Disponible: v12/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'MÁS TARDE' }));
    cleanup();
    render(<AvisoActualizacionAndroid />);
    expect(await screen.findByRole('link', { name: 'DESCARGAR ACTUALIZACIÓN' })).toBeInTheDocument();
  });
  it('sin conexión no bloquea; al recuperar señal comprueba de nuevo', async () => {
    fake.publicada.mockResolvedValueOnce({ tipo: 'sin_conexion' }).mockResolvedValue(version(11));
    render(<AvisoActualizacionAndroid />);
    await waitFor(() => { expect(fake.publicada).toHaveBeenCalledTimes(1); });
    expect(screen.queryByRole('link')).toBeNull();
    await evento('online');
    expect(await screen.findByRole('link', { name: 'DESCARGAR ACTUALIZACIÓN' })).toBeInTheDocument();
  });
  it('la PWA y el APK piloto no consultan la distribución como si fuera su actualización', async () => {
    fake.casos.versionAndroid = undefined;
    render(<AvisoActualizacionAndroid />);
    expect(fake.instalada).not.toHaveBeenCalled();
    cleanup();
    fake.casos.versionAndroid = fake.instalada;
    fake.instalada.mockResolvedValue({ codigo: 1, paquete: 'cl.reparto.app.piloto' });
    render(<AvisoActualizacionAndroid />);
    await waitFor(() => { expect(fake.instalada).toHaveBeenCalledTimes(1); });
    expect(fake.publicada).not.toHaveBeenCalled();
    expect(screen.queryByRole('link')).toBeNull();
  });
  it('si no se puede leer la versión instalada, no muestra una comparación inventada', async () => {
    fake.instalada.mockRejectedValue(new Error('No disponible'));
    render(<AvisoActualizacionAndroid />);
    await waitFor(() => { expect(fake.instalada).toHaveBeenCalledTimes(1); });
    expect(fake.publicada).not.toHaveBeenCalled();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
