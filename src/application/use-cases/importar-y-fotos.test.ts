import { describe, expect, it, vi } from 'vitest';
import type { ResultadoImportacion } from '../modelos';
import type { Imagenes, SubidaDeArchivos } from '../ports/imagenes';
import { puedeBuscar } from './buscar';
import { crearImportarClientesEnLotes } from './importar-clientes';
import { crearSubirFotoLocal } from './subir-foto';
import { err, fakeApi, http, ok } from './fakes.test-util';

const resultado = (validas: number, errores: ResultadoImportacion['errores'] = []): ResultadoImportacion => ({
  totalFilas: validas + errores.length, validas, errores,
  resumen: { clientesCreados: validas, clientesActualizados: 0, localesCreados: validas, localesActualizados: 0 },
});
const filas = (n: number) => Array.from({ length: n }, (_, i) => ({ razonSocial: `C${i}`, direccion: `Calle ${i}`, comuna: 'Maipú' }));

describe('importarClientesEnLotes', () => {
  it('parte en lotes, suma los resúmenes y reporta el progreso', async () => {
    const importar = vi.fn(() => Promise.resolve(ok(resultado(2))));
    const avances: number[] = [];
    const r = await crearImportarClientesEnLotes({ api: fakeApi({ importarClientes: importar }) })(filas(5), (p) => avances.push(p.procesadas), 2);
    expect(importar.mock.calls.map((c) => (c as unknown as [unknown[]])[0].length)).toEqual([2, 2, 1]);
    expect(avances).toEqual([2, 4, 5]);
    expect(r.ok && r.value).toMatchObject({ totalFilas: 5, validas: 6, resumen: { clientesCreados: 6 } });
  });

  it('corrige el número de fila de los errores para que cuente desde el inicio de la planilla', async () => {
    const importar = vi.fn()
      .mockResolvedValueOnce(ok(resultado(1, [{ fila: 2, errores: [{ codigo: 'COMUNA_INVALIDA', mensaje: 'x' }] }])))
      .mockResolvedValueOnce(ok(resultado(1, [{ fila: 1, errores: [{ codigo: 'RUT_DV_INVALIDO', mensaje: 'y' }] }])));
    const r = await crearImportarClientesEnLotes({ api: fakeApi({ importarClientes: importar }) })(filas(4), undefined, 2);
    expect(r.ok && r.value.errores.map((e) => e.fila)).toEqual([2, 3]);
  });

  it('si un lote falla se detiene, informa cuánto alcanzó y conserva lo ya importado', async () => {
    const importar = vi.fn().mockResolvedValueOnce(ok(resultado(2))).mockResolvedValueOnce(err({ kind: 'NETWORK' as const }));
    const r = await crearImportarClientesEnLotes({ api: fakeApi({ importarClientes: importar }) })(filas(6), undefined, 2);
    expect(!r.ok && r.error.procesadas).toBe(2);
    expect(!r.ok && r.error.parcial.validas).toBe(2);
    expect(importar).toHaveBeenCalledTimes(2);
  });

  it('un error de la API también detiene la importación', async () => {
    const r = await crearImportarClientesEnLotes({ api: fakeApi({ importarClientes: () => Promise.resolve(http(403)) }) })(filas(3));
    expect(!r.ok && r.error.error.status).toBe(403);
  });
});

describe('subirFotoLocal', () => {
  const foto = { blob: new Blob(['x']), tipo: 'webp' as const };
  const montar = (extra: { imagenes?: Imagenes; subida?: SubidaDeArchivos; api?: Parameters<typeof fakeApi>[0] } = {}) => {
    const imagenes: Imagenes = extra.imagenes ?? { comprimir: () => Promise.resolve(ok(foto)) };
    const subirMock = vi.fn(() => Promise.resolve(ok(undefined)));
    const subida: SubidaDeArchivos = extra.subida ?? { subir: subirMock };
    const registrar = vi.fn(() => Promise.resolve(ok(undefined)));
    const api = fakeApi({ solicitarUrlSubida: () => Promise.resolve(ok({ path: 'e/l/x.webp', url: 'https://alm/up' })), registrarFoto: registrar, ...extra.api });
    return { subir: crearSubirFotoLocal({ api, imagenes, subida }), subirMock, registrar };
  };

  it('comprime, sube a la URL firmada y registra el path', async () => {
    const { subir, subirMock, registrar } = montar();
    expect(await subir('l1', new Blob(['original']))).toEqual({ ok: true, value: 'e/l/x.webp' });
    expect(subirMock).toHaveBeenCalledWith('https://alm/up', foto);
    expect(registrar).toHaveBeenCalledWith('l1', 'e/l/x.webp');
  });

  it('si falla comprimir, no toca la red', async () => {
    const solicitar = vi.fn();
    const { subir } = montar({ imagenes: { comprimir: () => Promise.resolve(err({ detalle: 'x' })) }, api: { solicitarUrlSubida: solicitar } });
    expect((await subir('l1', new Blob())).ok).toBe(false);
    expect(solicitar).not.toHaveBeenCalled();
  });

  it('si falla la subida, no registra la foto', async () => {
    const { subir, registrar } = montar({ subida: { subir: () => Promise.resolve(err({ detalle: 'red' })) } });
    const r = await subir('l1', new Blob());
    expect(!r.ok && r.error).toContain('subir la foto');
    expect(registrar).not.toHaveBeenCalled();
  });

  it('un error de la API al pedir la URL se muestra en lenguaje simple', async () => {
    const { subir } = montar({ api: { solicitarUrlSubida: () => Promise.resolve(http(404, { mensaje: 'El local no existe.' })) } });
    expect(await subir('l1', new Blob())).toEqual({ ok: false, error: 'El local no existe.' });
  });
});

describe('puedeBuscar', () => {
  it('desde la 3.ª letra, ignorando espacios y tildes', () => {
    expect(puedeBuscar('ra')).toBe(false);
    expect(puedeBuscar(' r a ')).toBe(false);
    expect(puedeBuscar('rab')).toBe(true);
    expect(puedeBuscar('ñuñ')).toBe(true);
  });
});
