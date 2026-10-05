import { describe, expect, it, vi } from 'vitest';
import { analizarListaEnlaces } from '../../domain/lista-enlaces';
import { err, fakeApi, http, ok } from './fakes.test-util';
import { crearImportarEnlaces } from './importar-enlaces';

const CORTO = (n: number): string => `https://maps.app.goo.gl/corto${n}`;
const lista = (n: number): string => Array.from({ length: n }, (_, i) => `Calle ${i + 1} 100, San Bernardo\n${CORTO(i)}`).join('\n\n');

describe('importar una lista de direcciones con enlace', () => {
  it('crea cada cliente con su dirección como nombre y fija el pin con el enlace', async () => {
    const crearCliente = vi.fn((f: { direccion: string }) => Promise.resolve(ok({ clienteId: `c-${f.direccion}`, localId: `l-${f.direccion}`, existente: false })));
    const fijarPinDesdeEnlace = vi.fn(() => Promise.resolve(ok({ resultado: 'fijado' as const, lat: -33.6, lng: -70.7 })));
    const r = await crearImportarEnlaces({ api: fakeApi({ crearCliente, fijarPinDesdeEnlace }) })(analizarListaEnlaces(lista(2)).entradas);
    expect(crearCliente).toHaveBeenCalledWith({ razonSocial: 'Calle 1 100', direccion: 'Calle 1 100', comuna: 'San Bernardo' });
    expect(fijarPinDesdeEnlace).toHaveBeenCalledWith('l-Calle 1 100', CORTO(0));
    expect(r).toMatchObject({ total: 2, creados: 2, yaExistian: 0, pinesFijados: 2, porBuscar: 0, pinesNoLeidos: [], fallos: [] });
  });

  it('si la fila viene de una planilla, crea el cliente con su razón social, RUT, giro y nota (no con la dirección como nombre)', async () => {
    const crearCliente = vi.fn(() => Promise.resolve(ok({ clienteId: 'c', localId: 'l', existente: true })));
    const fijarPinDesdeEnlace = vi.fn(() => Promise.resolve(ok({ resultado: 'fijado' as const, lat: -33.6, lng: -70.7 })));
    const entrada = { numero: 1, crudo: 'x', estado: 'lista' as const, motivos: [], direccion: 'Calle 1 100', comuna: 'Maipú', enlace: CORTO(0), tipoEnlace: 'corto' as const, razonSocial: 'Kiosko Sol', rut: '12.345.678-5', giro: 'Almacén', nota: 'Cierra a las 14' };
    await crearImportarEnlaces({ api: fakeApi({ crearCliente, fijarPinDesdeEnlace }) })([entrada]);
    expect(crearCliente).toHaveBeenCalledWith({ razonSocial: 'Kiosko Sol', direccion: 'Calle 1 100', comuna: 'Maipú', rut: '12.345.678-5', giro: 'Almacén', nota: 'Cierra a las 14' });
  });

  it('los enlaces de búsqueda y las direcciones sin enlace no leen pin: quedan para que el sistema las busque', async () => {
    const crearCliente = vi.fn(() => Promise.resolve(ok({ clienteId: 'c', localId: 'l', existente: false })));
    const fijarPinDesdeEnlace = vi.fn();
    const texto = 'Los Suspiros 16463 San Bernardo\nhttps://www.google.com/maps/search/?api=1&query=Los+Suspiros+16463+San+Bernardo%2C+Chile\n\nFreire 917 San Bernardo';
    const r = await crearImportarEnlaces({ api: fakeApi({ crearCliente, fijarPinDesdeEnlace }) })(analizarListaEnlaces(texto).entradas);
    expect(fijarPinDesdeEnlace).not.toHaveBeenCalled();
    expect(r).toMatchObject({ creados: 2, porBuscar: 2, pinesFijados: 0 });
  });

  it('lo que ya existía se completa y se cuenta aparte; un pin que queda como propuesta también', async () => {
    const crearCliente = vi.fn(() => Promise.resolve(ok({ clienteId: 'c', localId: 'l', existente: true })));
    const fijarPinDesdeEnlace = vi.fn(() => Promise.resolve(ok({ resultado: 'propuesto' as const, lat: -33.6, lng: -70.7 })));
    const r = await crearImportarEnlaces({ api: fakeApi({ crearCliente, fijarPinDesdeEnlace }) })(analizarListaEnlaces(lista(1)).entradas);
    expect(r).toMatchObject({ creados: 0, yaExistian: 1, pinesPropuestos: 1, pinesFijados: 0 });
  });

  it('un enlace que no se puede leer no frena nada: el cliente queda cargado y se informa; un error al crear se anota y sigue', async () => {
    const crearCliente = vi.fn()
      .mockResolvedValueOnce(ok({ clienteId: 'c1', localId: 'l1', existente: false }))
      .mockResolvedValueOnce(err({ kind: 'NETWORK' as const }))
      .mockResolvedValueOnce(ok({ clienteId: 'c3', localId: 'l3', existente: false }));
    const fijarPinDesdeEnlace = vi.fn()
      .mockResolvedValueOnce(http(422, { mensaje: 'No pude leer la ubicación de ese enlace.' }))
      .mockResolvedValueOnce(ok({ resultado: 'fijado' as const, lat: -33.6, lng: -70.7 }));
    const r = await crearImportarEnlaces({ api: fakeApi({ crearCliente, fijarPinDesdeEnlace }) })(analizarListaEnlaces(lista(3)).entradas, undefined, 1);
    expect(r.creados).toBe(2);
    expect(r.pinesFijados).toBe(1);
    expect(r.pinesNoLeidos).toEqual([{ numero: 1, direccion: 'Calle 1 100', mensaje: 'No pude leer la ubicación de ese enlace.' }]);
    expect(r.fallos).toEqual([{ numero: 2, direccion: 'Calle 2 100', mensaje: expect.stringContaining('Sin conexión') as string }]);
  });

  it('solo carga las listas (no las que faltan datos ni las repetidas) y avisa el avance', async () => {
    const crearCliente = vi.fn(() => Promise.resolve(ok({ clienteId: 'c', localId: 'l', existente: false })));
    const fijarPinDesdeEnlace = vi.fn(() => Promise.resolve(ok({ resultado: 'fijado' as const, lat: -33.6, lng: -70.7 })));
    const alAvanzar = vi.fn();
    const texto = `Sin comuna 123\n${CORTO(0)}\n\nCalle 1 100, San Bernardo\n${CORTO(1)}\n\nCalle 1 100, San Bernardo\n${CORTO(2)}`;
    const r = await crearImportarEnlaces({ api: fakeApi({ crearCliente, fijarPinDesdeEnlace }) })(analizarListaEnlaces(texto).entradas, alAvanzar);
    expect(crearCliente).toHaveBeenCalledTimes(1);
    expect(r.total).toBe(1);
    expect(alAvanzar).toHaveBeenLastCalledWith({ procesadas: 1, total: 1 });
  });

  it('procesa varias a la vez pero nunca más que la concurrencia pedida', async () => {
    let activas = 0;
    let maxima = 0;
    const crearCliente = vi.fn(async () => {
      activas++;
      maxima = Math.max(maxima, activas);
      await new Promise((resolve) => setTimeout(resolve, 5));
      activas--;
      return ok({ clienteId: 'c', localId: 'l', existente: false });
    });
    const fijarPinDesdeEnlace = vi.fn(() => Promise.resolve(ok({ resultado: 'fijado' as const, lat: -33.6, lng: -70.7 })));
    const r = await crearImportarEnlaces({ api: fakeApi({ crearCliente, fijarPinDesdeEnlace }) })(analizarListaEnlaces(lista(10)).entradas, undefined, 3);
    expect(r.creados).toBe(10);
    expect(maxima).toBe(3);
  });
});
