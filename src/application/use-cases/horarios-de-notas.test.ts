import { describe, expect, it, vi } from 'vitest';
import { err, fakeApi, ok } from './fakes.test-util';
import { crearAplicarHorariosDeNotas, revisarNotas } from './horarios-de-notas';

const local = (n: string, nota: string) => ({ localId: `l${n}`, razonSocial: `Local ${n}`, nota });

describe('revisar las notas', () => {
  it('separa las que traen un horario claro de las que parecen horario y no se entienden; las demás se ignoran', () => {
    const r = revisarNotas([local('1', 'De 9 am a 6 pm'), local('2', 'Portón verde'), local('3', 'De 10 pm a 2 am'), local('4', ''), local('5', 'Cierra de 2 a 4 pm')]);
    expect(r.conNota).toBe(4);
    expect(r.entendidos.map((e) => e.localId)).toEqual(['l1', 'l5']);
    expect(r.sinEntender.map((e) => e.localId)).toEqual(['l3']);
  });
});

describe('aplicar los horarios', () => {
  const entendidos = revisarNotas([local('1', 'De 9 am a 6 pm'), local('2', 'Cierra a las 2 pm'), local('3', 'De 7 am a 3 pm')]).entendidos;

  it('guarda de lunes a sábado (el domingo queda sin dato) y no pisa un horario que ya estaba cargado', async () => {
    const obtenerHorario = vi.fn((id: string) => Promise.resolve(ok(id === 'l2' ? [{ dia: 1, cerrado: false, tramos: [{ desde: 600, hasta: 1080 }] }] : [])));
    const guardarHorario = vi.fn((_id: string, dias: readonly unknown[]) => Promise.resolve(ok(dias as never)));
    const r = await crearAplicarHorariosDeNotas({ api: fakeApi({ obtenerHorario, guardarHorario }) })(entendidos);
    expect(r).toEqual({ aplicados: 2, yaTenian: 1, fallos: [] });
    expect(guardarHorario).toHaveBeenCalledTimes(2);
    const [id, dias] = guardarHorario.mock.calls[0] as unknown as [string, { dia: number; cerrado: boolean; tramos: unknown[] }[]];
    expect(id).toBe('l1');
    expect(dias.map((d) => d.dia)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(dias[0]).toEqual({ dia: 1, cerrado: false, tramos: [{ desde: 540, hasta: 1080 }] });
  });

  it('un error en uno no frena a los demás y se informa con el nombre del local', async () => {
    const obtenerHorario = vi.fn(() => Promise.resolve(ok([])));
    const guardarHorario = vi.fn()
      .mockResolvedValueOnce(err({ kind: 'NETWORK' as const }))
      .mockResolvedValue(ok([]));
    const alAvanzar = vi.fn();
    const r = await crearAplicarHorariosDeNotas({ api: fakeApi({ obtenerHorario, guardarHorario }) })(entendidos, alAvanzar, 1);
    expect(r.aplicados).toBe(2);
    expect(r.fallos).toEqual([{ razonSocial: 'Local 1', mensaje: expect.stringContaining('Sin conexión') as string }]);
    expect(alAvanzar).toHaveBeenLastCalledWith({ procesados: 3, total: 3 });
  });
});
