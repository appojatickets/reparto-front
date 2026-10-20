import { describe, expect, it, vi } from 'vitest';
import { crearVozAndroid } from './voz-android';
describe('dictado nativo Android', () => {
  it('entrega texto final y termina una sola vez', async () => {
    const alTexto = vi.fn(), alTerminar = vi.fn();
    const s = crearVozAndroid({ dictar: () => Promise.resolve({ texto: ' Colón 765 ' }) }).escuchar({ alTexto, alTerminar });
    await vi.waitFor(() => { expect(alTerminar).toHaveBeenCalledTimes(1); });
    expect(alTexto).toHaveBeenCalledWith({ texto: 'Colón 765', final: true });s.detener();expect(alTerminar).toHaveBeenCalledTimes(1);
  });
  it('cancelar no muestra error ni borra el campo', async () => {
    const alTexto = vi.fn(), alTerminar = vi.fn();
    crearVozAndroid({ dictar: () => Promise.resolve({ cancelado: true }) }).escuchar({ alTexto, alTerminar });
    await vi.waitFor(() => { expect(alTerminar).toHaveBeenCalledWith(undefined); });expect(alTexto).not.toHaveBeenCalled();
  });
  it('ignora resultados tardíos al salir', async () => {
    let resolver!: (r: { texto: string }) => void;
    const alTexto = vi.fn(), alTerminar = vi.fn();
    const s = crearVozAndroid({ dictar: () => new Promise(r => { resolver = r; }) }).escuchar({ alTexto, alTerminar });
    s.detener();resolver({ texto: 'tardío' });await Promise.resolve();
    expect(alTexto).not.toHaveBeenCalled();expect(alTerminar).toHaveBeenCalledTimes(1);
  });
  it('informa permiso bloqueado sin quedar escuchando', async () => {
    const alTerminar = vi.fn();
    crearVozAndroid({ dictar: () => Promise.reject(Object.assign(new Error('Bloqueado'), { code: 'PERMISO' })) }).escuchar({ alTexto: vi.fn(), alTerminar });
    await vi.waitFor(() => { expect(alTerminar).toHaveBeenCalledWith('PERMISO'); });
  });
});
