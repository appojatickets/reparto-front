import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { err, ok } from '../../../domain/result';
import type { UsuarioSesion } from '../../../application/modelos';
import type { ApiClient } from '../../../application/ports/api-client';
import type { EstadoSesion } from '../../../application/use-cases/sesion';
import { fakeApi } from '../../../application/use-cases/fakes.test-util';
import { Aplicacion } from './Aplicacion';
import { ProveedorCasos, type Casos } from './contexto';

const CHOFER: UsuarioSesion = { id: 'u1', username: 'jperez', nombre: 'Juan Pérez', rol: 'chofer' };
const ADMIN: UsuarioSesion = { id: 'u2', username: 'admin', nombre: 'Matías Carrión', rol: 'admin' };
const DESPACHADOR: UsuarioSesion = { id: 'u3', username: 'desp', nombre: 'Ana Soto', rol: 'despachador' };

const montar = (opciones: { ruta?: string; sesion?: UsuarioSesion; api?: Partial<ApiClient>; casos?: Partial<Casos> } = {}) => {
  window.history.pushState({}, '', opciones.ruta ?? '/');
  const estado: EstadoSesion = opciones.sesion ? { tipo: 'sesion', usuario: opciones.sesion } : { tipo: 'sin_sesion' };
  const casos: Casos = {
    api: fakeApi(opciones.api),
    iniciarSesion: vi.fn(() => Promise.resolve(err('Usuario o clave incorrectos. Te quedan 4 intentos.'))),
    restaurarSesion: vi.fn(() => Promise.resolve(estado)),
    cerrarSesion: vi.fn(),
    importarClientesEnLotes: vi.fn(),
    subirFotoLocal: vi.fn(),
    ...opciones.casos,
  };
  return { casos, ...render(<ProveedorCasos casos={casos}><Aplicacion /></ProveedorCasos>) };
};

beforeEach(() => { window.history.pushState({}, '', '/'); });
afterEach(() => { window.history.pushState({}, '', '/'); });

describe('entrada y protección por rol', () => {
  it('sin sesión se redirige a /entrar', async () => {
    montar({ ruta: '/clientes' });
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/entrar');
  });

  it('un login correcto lleva al inicio con el nombre del usuario', async () => {
    const iniciarSesion = vi.fn(() => Promise.resolve(ok(CHOFER)));
    montar({ ruta: '/entrar', casos: { iniciarSesion } });
    await userEvent.type(await screen.findByLabelText('Usuario'), 'jperez');
    await userEvent.type(screen.getByLabelText('Clave (6 números)'), '482915');
    await userEvent.click(screen.getByRole('button', { name: 'ENTRAR' }));
    expect(await screen.findByRole('heading', { name: 'Hola, Juan' })).toBeInTheDocument();
    expect(iniciarSesion).toHaveBeenCalledWith('jperez', '482915');
  });

  it('un login fallido muestra el mensaje (con los intentos que quedan) y no entra', async () => {
    montar({ ruta: '/entrar' });
    await userEvent.type(await screen.findByLabelText('Usuario'), 'x');
    await userEvent.type(screen.getByLabelText('Clave (6 números)'), '000001');
    await userEvent.click(screen.getByRole('button', { name: 'ENTRAR' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Te quedan 4 intentos');
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('el chofer ve solo su ruta: sin enlaces de clientes, pines, importación ni usuarios', async () => {
    montar({ sesion: CHOFER });
    expect(await screen.findByText('Tu ruta del día estará disponible muy pronto.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('el despachador ve clientes y pines, no importación ni usuarios', async () => {
    montar({ sesion: DESPACHADOR });
    expect(await screen.findByRole('link', { name: 'BUSCAR CLIENTE' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PINES DE LOCALES' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'USUARIOS' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'IMPORTAR CLIENTES' })).toBeNull();
  });

  it('el admin ve todo el menú', async () => {
    montar({ sesion: ADMIN });
    for (const nombre of ['BUSCAR CLIENTE', 'CLIENTE NUEVO', 'PINES DE LOCALES', 'IMPORTAR CLIENTES', 'USUARIOS']) {
      expect(await screen.findByRole('link', { name: nombre })).toBeInTheDocument();
    }
  });

  it('un chofer que escribe la dirección de una pantalla de administración vuelve al inicio', async () => {
    montar({ ruta: '/admin/usuarios', sesion: CHOFER });
    expect(await screen.findByText('Tu ruta del día estará disponible muy pronto.')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('SALIR cierra la sesión y vuelve a /entrar', async () => {
    const { casos } = montar({ sesion: ADMIN });
    await userEvent.click(await screen.findByRole('button', { name: 'SALIR' }));
    expect(casos.cerrarSesion).toHaveBeenCalled();
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('sin señal al abrir (pero con sesión guardada) ofrece reintentar en lugar de cerrar la sesión', async () => {
    const restaurarSesion = vi.fn(() => Promise.resolve<EstadoSesion>({ tipo: 'sin_conexion' }));
    montar({ casos: { restaurarSesion } });
    expect(await screen.findByRole('heading', { name: 'Sin conexión' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'REINTENTAR' }));
    await waitFor(() => { expect(restaurarSesion).toHaveBeenCalledTimes(2); });
  });
});

describe('búsqueda de clientes', () => {
  const resultado = { localId: 'l1', clienteId: 'c1', razonSocial: 'Rabelo Mágica SpA', direccion: 'Av. Providencia 2500', comuna: 'Providencia', pinEstado: 'validado' as const };

  it('busca desde la 3.ª letra y muestra tarjetas con comuna y estado del pin', async () => {
    const buscarClientes = vi.fn(() => Promise.resolve(ok([resultado])));
    montar({ ruta: '/clientes', sesion: DESPACHADOR, api: { buscarClientes } });
    const campo = await screen.findByLabelText('Nombre o dirección');
    await userEvent.type(campo, 'ra');
    expect(screen.getByText('Los resultados aparecen al escribir.')).toBeInTheDocument();
    expect(buscarClientes).not.toHaveBeenCalled();
    await userEvent.type(campo, 'be');
    expect(await screen.findByRole('link', { name: 'Rabelo Mágica SpA' })).toHaveAttribute('href', '/clientes/l1');
    expect(screen.getByText('Providencia')).toBeInTheDocument();
    expect(screen.getByText('PIN VALIDADO')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '' })).toBeDefined();
  });

  it('sin resultados lo dice en lenguaje simple y un error de red se muestra', async () => {
    const buscarClientes = vi.fn().mockResolvedValueOnce(ok([])).mockResolvedValueOnce(err({ kind: 'NETWORK' }));
    montar({ ruta: '/clientes', sesion: DESPACHADOR, api: { buscarClientes } });
    const campo = await screen.findByLabelText('Nombre o dirección');
    await userEvent.type(campo, 'zzz');
    expect(await screen.findByText(/No hay clientes con ese texto/)).toBeInTheDocument();
    await userEvent.type(campo, 'x');
    expect(await screen.findByText(/Sin conexión/)).toBeInTheDocument();
  });
});

describe('detalle del local', () => {
  const local = { id: 'l1', clienteId: 'c1', razonSocial: 'Rabelo Mágica SpA', direccion: 'Av. Providencia 2500', comuna: 'Providencia', pinEstado: 'validado' as const, lat: -33.4372, lng: -70.6506, streetviewRumbo: 120, nota: 'portón verde' };

  it('ofrece Waze, Google Maps y Street View con las coordenadas del pin', async () => {
    montar({ ruta: '/clientes/l1', sesion: DESPACHADOR, api: { obtenerLocal: () => Promise.resolve(ok(local)) } });
    expect(await screen.findByRole('heading', { name: 'Rabelo Mágica SpA' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'IR CON WAZE' })).toHaveAttribute('href', 'https://waze.com/ul?ll=-33.4372,-70.6506&navigate=yes');
    expect(screen.getByRole('link', { name: 'IR CON GOOGLE MAPS' })).toHaveAttribute('href', expect.stringContaining('destination=-33.4372,-70.6506'));
    expect(screen.getByRole('link', { name: /VER CALLE/ })).toHaveAttribute('href', expect.stringContaining('heading=120'));
  });

  it('un local sin pin no ofrece navegación y avisa', async () => {
    const sinPin = { id: 'l1', clienteId: 'c1', razonSocial: 'X', direccion: 'Y', comuna: 'Maipú', pinEstado: 'pendiente' as const };
    montar({ ruta: '/clientes/l1', sesion: DESPACHADOR, api: { obtenerLocal: () => Promise.resolve(ok(sinPin)) } });
    expect(await screen.findByText('Este local todavía no tiene pin.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'IR CON WAZE' })).toBeNull();
  });

  it('guarda nota y rumbo', async () => {
    const actualizarLocal = vi.fn(() => Promise.resolve(ok(undefined)));
    montar({ ruta: '/clientes/l1', sesion: DESPACHADOR, api: { obtenerLocal: () => Promise.resolve(ok(local)), actualizarLocal } });
    const nota = await screen.findByLabelText('Nota para el chofer');
    await userEvent.clear(nota);
    await userEvent.type(nota, 'timbre roto');
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR' }));
    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
    expect(actualizarLocal).toHaveBeenCalledWith('l1', { nota: 'timbre roto', streetviewRumbo: 120 });
  });
});

describe('cliente nuevo', () => {
  it('manda solo los campos con datos y lleva al detalle; los errores de validación se listan', async () => {
    const crearCliente = vi.fn()
      .mockResolvedValueOnce(err({ kind: 'HTTP', status: 422, mensaje: 'Hay datos inválidos.', detalle: { errores: [{ mensaje: 'Falta la dirección.' }, { mensaje: 'La comuna no es de la Región Metropolitana.' }] } }))
      .mockResolvedValueOnce(ok({ clienteId: 'c9', localId: 'l9' }));
    montar({ ruta: '/clientes/nuevo', sesion: DESPACHADOR, api: { crearCliente, obtenerLocal: () => Promise.resolve(ok({ id: 'l9', clienteId: 'c9', razonSocial: 'Kiosko Sol', direccion: 'Calle 1', comuna: 'Maipú', pinEstado: 'pendiente' as const })) } });
    await userEvent.type(await screen.findByLabelText('Razón social o nombre'), 'Kiosko Sol');
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR CLIENTE' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falta la dirección. La comuna no es de la Región Metropolitana.');
    await userEvent.type(screen.getByLabelText('Dirección'), 'Calle 1');
    await userEvent.selectOptions(screen.getByLabelText('Comuna'), 'Maipú');
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR CLIENTE' }));
    expect(await screen.findByRole('heading', { name: 'Kiosko Sol' })).toBeInTheDocument();
    expect(crearCliente).toHaveBeenLastCalledWith({ razonSocial: 'Kiosko Sol', direccion: 'Calle 1', comuna: 'Maipú' });
  });
});

describe('importar clientes', () => {
  const planilla = 'Rut\tRazón Social\tDirección\tComuna\n12.345.678-5\tRabelo SpA\tAv. X 1\tMaipú\n\tKiosko Sol\tCalle 2\tÑuñoa';

  it('reconoce las columnas, muestra la vista previa y bloquea si faltan obligatorias', async () => {
    montar({ ruta: '/admin/importar', sesion: ADMIN });
    const area = await screen.findByLabelText('O pega aquí la planilla');
    const boton = screen.getByRole('button', { name: 'IMPORTAR' });
    expect(boton).toBeDisabled();
    await userEvent.click(area);
    await userEvent.paste('Nombre\tTeléfono\nKiosko\t123');
    expect(await screen.findByText(/Faltan columnas obligatorias: Dirección, Comuna/)).toBeInTheDocument();
    expect(screen.getByText(/Se ignorarán estas columnas: Teléfono/)).toBeInTheDocument();
    expect(boton).toBeDisabled();
  });

  it('importa por lotes y muestra el resumen y las filas con problemas', async () => {
    const importarClientesEnLotes = vi.fn((filas: readonly unknown[], alAvanzar?: (p: { procesadas: number; total: number }) => void) => {
      alAvanzar?.({ procesadas: filas.length, total: filas.length });
      return Promise.resolve(ok({ totalFilas: 2, validas: 1, errores: [{ fila: 2, errores: [{ codigo: 'COMUNA_INVALIDA', mensaje: 'La comuna no es de la Región Metropolitana.' }] }], resumen: { clientesCreados: 1, clientesActualizados: 0, localesCreados: 1, localesActualizados: 0 } }));
    });
    montar({ ruta: '/admin/importar', sesion: ADMIN, casos: { importarClientesEnLotes } });
    await userEvent.click(await screen.findByLabelText('O pega aquí la planilla'));
    await userEvent.paste(planilla);
    expect(await screen.findByText('2 filas listas para importar.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'IMPORTAR' }));
    const resultado = await screen.findByRole('region', { name: 'Resultado de la importación' });
    expect(within(resultado).getByText(/Clientes nuevos: 1/)).toBeInTheDocument();
    expect(within(resultado).getByText('La comuna no es de la Región Metropolitana.')).toBeInTheDocument();
    expect(importarClientesEnLotes.mock.calls[0]?.[0]).toEqual([
      { rut: '12.345.678-5', razonSocial: 'Rabelo SpA', direccion: 'Av. X 1', comuna: 'Maipú' },
      { razonSocial: 'Kiosko Sol', direccion: 'Calle 2', comuna: 'Ñuñoa' },
    ]);
  });

  it('si la importación se corta avisa cuánto alcanzó y que reimportar es seguro', async () => {
    const parcial = { totalFilas: 2, validas: 1, errores: [], resumen: { clientesCreados: 1, clientesActualizados: 0, localesCreados: 1, localesActualizados: 0 } };
    const importarClientesEnLotes = vi.fn(() => Promise.resolve(err({ error: { kind: 'NETWORK' as const }, procesadas: 1, parcial })));
    montar({ ruta: '/admin/importar', sesion: ADMIN, casos: { importarClientesEnLotes } });
    await userEvent.click(await screen.findByLabelText('O pega aquí la planilla'));
    await userEvent.paste(planilla);
    await userEvent.click(await screen.findByRole('button', { name: 'IMPORTAR' }));
    expect(await screen.findByText(/Se detuvo después de 1 filas.*no se duplica nada/)).toBeInTheDocument();
  });
});

describe('usuarios', () => {
  it('crear un usuario muestra el usuario generado y la clave para entregarlos', async () => {
    const crearUsuario = vi.fn(() => Promise.resolve(ok({ id: 'u9', username: 'jperez', nombre: 'Juan Pérez', rol: 'chofer' as const, activo: true })));
    const listarUsuarios = vi.fn(() => Promise.resolve(ok([{ ...ADMIN, activo: true }])));
    montar({ ruta: '/admin/usuarios', sesion: ADMIN, api: { crearUsuario, listarUsuarios } });
    await userEvent.type(await screen.findByLabelText('Nombre'), 'Juan');
    await userEvent.type(screen.getByLabelText('Apellido paterno'), 'Pérez');
    await userEvent.type(screen.getByLabelText('Clave inicial (6 números)'), '482915');
    await userEvent.click(screen.getByRole('button', { name: 'CREAR USUARIO' }));
    expect(await screen.findByText('Usuario: jperez')).toBeInTheDocument();
    expect(screen.getByText('Clave: 482915')).toBeInTheDocument();
    expect(crearUsuario).toHaveBeenCalledWith({ nombre: 'Juan', apellidoPaterno: 'Pérez', rol: 'chofer', pin: '482915' });
    expect(listarUsuarios).toHaveBeenCalledTimes(2); // se recarga la lista
  });

  it('no permite desactivarse a sí mismo; sí a otro usuario', async () => {
    const cambiarEstadoUsuario = vi.fn(() => Promise.resolve(ok(undefined)));
    const listarUsuarios = vi.fn(() => Promise.resolve(ok([{ ...ADMIN, activo: true }, { ...CHOFER, activo: true }])));
    montar({ ruta: '/admin/usuarios', sesion: ADMIN, api: { listarUsuarios, cambiarEstadoUsuario } });
    const botones = await screen.findAllByRole('button', { name: 'DESACTIVAR' });
    expect(botones).toHaveLength(1);
    await userEvent.click(botones[0] as HTMLElement);
    expect(cambiarEstadoUsuario).toHaveBeenCalledWith('u1', false);
  });

  it('un error de la API al crear se muestra en lenguaje simple', async () => {
    const crearUsuario = vi.fn(() => Promise.resolve(err({ kind: 'HTTP' as const, status: 422, mensaje: 'La clave es demasiado fácil de adivinar.' })));
    montar({ ruta: '/admin/usuarios', sesion: ADMIN, api: { crearUsuario, listarUsuarios: () => Promise.resolve(ok([])) } });
    await userEvent.type(await screen.findByLabelText('Nombre'), 'A');
    await userEvent.type(screen.getByLabelText('Apellido paterno'), 'B');
    await userEvent.type(screen.getByLabelText('Clave inicial (6 números)'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'CREAR USUARIO' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La clave es demasiado fácil de adivinar.');
  });
});

describe('pines', () => {
  it('lista propuestas con la distancia al pin actual y permite aceptar', async () => {
    const propuesta = { id: 'p1', direccion: 'Calle 1 10', lat: -33.6, lng: -70.8, distanciaActualM: 900, estado: 'pendiente' as const, razonSocial: 'Rabelo', comuna: 'Maipú' };
    const listarPropuestas = vi.fn().mockResolvedValueOnce(ok([propuesta])).mockResolvedValueOnce(ok([]));
    const resolverPropuesta = vi.fn(() => Promise.resolve(ok(undefined)));
    montar({ ruta: '/pines', sesion: DESPACHADOR, api: { listarPropuestas, resolverPropuesta } });
    expect(await screen.findByText('900 m del pin actual')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'ACEPTAR' }));
    expect(resolverPropuesta).toHaveBeenCalledWith('p1', 'aceptar');
    expect(await screen.findByText('No hay propuestas pendientes.')).toBeInTheDocument();
  });

  it('propone pines desde una planilla y muestra el resumen', async () => {
    const importarPines = vi.fn(() => Promise.resolve(ok({ recibidas: 1, pendientes: 1, sinLocal: 0, errores: [] })));
    montar({ ruta: '/pines', sesion: DESPACHADOR, api: { importarPines, listarPropuestas: () => Promise.resolve(ok([])) } });
    await userEvent.click(await screen.findByLabelText('Planilla de pines'));
    await userEvent.paste('Dirección\tLatitud\tLongitud\nCalle 1 10\t-33,5\t-70,7');
    await userEvent.click(await screen.findByRole('button', { name: 'PROPONER PINES' }));
    expect(await screen.findByText(/Recibidos: 1 · para revisar: 1/)).toBeInTheDocument();
    expect(importarPines).toHaveBeenCalledWith([{ direccion: 'Calle 1 10', lat: '-33,5', lng: '-70,7' }]);
  });
});
