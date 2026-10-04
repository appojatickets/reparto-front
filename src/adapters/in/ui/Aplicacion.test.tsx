import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { err, ok } from '../../../domain/result';
import type { UsuarioSesion } from '../../../application/modelos';
import type { ApiClient } from '../../../application/ports/api-client';
import type { EstadoSesion } from '../../../application/use-cases/sesion';
import { fakeApi, http } from '../../../application/use-cases/fakes.test-util';
import { Aplicacion } from './Aplicacion';
import { EVENTO_SERVIDOR_DESPERTANDO } from './despertando';
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
    ahora: () => new Date('2026-10-05T15:00:00Z'),
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
    expect(await screen.findByRole('heading', { name: '¿Qué camión manejas hoy?' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('el despachador ve clientes y pines, no importación ni usuarios', async () => {
    montar({ sesion: DESPACHADOR });
    expect(await screen.findByRole('link', { name: 'BUSCAR CLIENTE' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PINES DE LOCALES' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'FACTURAS DEL DÍA' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'RUTAS DEL DÍA' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'CONFIGURACIÓN' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'USUARIOS' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'CAMIONES' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'IMPORTAR CLIENTES' })).toBeNull();
  });

  it('el admin ve todo el menú', async () => {
    montar({ sesion: ADMIN });
    for (const nombre of ['FACTURAS DEL DÍA', 'RUTAS DEL DÍA', 'BUSCAR CLIENTE', 'CLIENTE NUEVO', 'PINES DE LOCALES', 'IMPORTAR CLIENTES', 'CAMIONES', 'CONFIGURACIÓN', 'USUARIOS']) {
      expect(await screen.findByRole('link', { name: nombre })).toBeInTheDocument();
    }
  });

  it('un chofer que escribe la dirección de una pantalla de administración vuelve al inicio', async () => {
    montar({ ruta: '/admin/usuarios', sesion: CHOFER });
    expect(await screen.findByRole('heading', { name: '¿Qué camión manejas hoy?' })).toBeInTheDocument();
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

describe('servidor dormido', () => {
  it('muestra «Despertando servidor» mientras la API reintenta y lo oculta al terminar', async () => {
    montar({ sesion: ADMIN });
    await screen.findByRole('heading', { name: 'Hola, Matías' });
    expect(screen.queryByText(/Despertando servidor/)).toBeNull();
    window.dispatchEvent(new CustomEvent(EVENTO_SERVIDOR_DESPERTANDO, { detail: true }));
    expect(await screen.findByText(/Despertando servidor… puede tardar hasta 1 minuto/)).toBeInTheDocument();
    window.dispatchEvent(new CustomEvent(EVENTO_SERVIDOR_DESPERTANDO, { detail: false }));
    await waitFor(() => { expect(screen.queryByText(/Despertando servidor/)).toBeNull(); });
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

describe('horario del local (editor con botones)', () => {
  const local = { id: 'l1', clienteId: 'c1', razonSocial: 'Rabelo Mágica SpA', direccion: 'Av. Providencia 2500', comuna: 'Providencia', pinEstado: 'validado' as const, lat: -33.4372, lng: -70.6506 };
  const abrir = async (api: Partial<ApiClient> = {}, sesion = DESPACHADOR) => {
    montar({ ruta: '/clientes/l1', sesion, api: { obtenerLocal: () => Promise.resolve(ok(local)), ...api } });
    return screen.findByRole('region', { name: 'Editar horario de atención' });
  };
  const resumen = () => within(screen.getByRole('list', { name: 'Horario actual' }));

  it('muestra el horario guardado y los días sin dato', async () => {
    await abrir({ obtenerHorario: () => Promise.resolve(ok([{ dia: 1, cerrado: false, tramos: [{ desde: 600, hasta: 1080 }] }, { dia: 0, cerrado: true, tramos: [] }])) });
    expect(resumen().getByText(/Abre 10:00 · cierra 18:00/)).toBeInTheDocument();
    expect(resumen().getByText(/Domingo:/).parentElement).toHaveTextContent('Cerrado');
    expect(resumen().getByText(/Martes:/).parentElement).toHaveTextContent('Sin dato');
  });

  it('con botones: lun a vie abre a las 10, cierra a las 18, colación 13 a 14, domingo cerrado, y guarda', async () => {
    const guardarHorario = vi.fn((_id: string, dias: unknown) => Promise.resolve(ok(dias as never)));
    const editor = await abrir({ guardarHorario });
    const e = within(editor);
    await userEvent.click(e.getByRole('button', { name: 'LUN A VIE' }));
    await userEvent.click(e.getByRole('button', { name: 'Abre a las 10:00' }));
    await userEvent.click(e.getByRole('button', { name: 'Cierra a las 18:00' }));
    await userEvent.click(e.getByRole('button', { name: 'Colación de 13:00 a 14:00' }));
    await userEvent.click(e.getByRole('button', { name: 'LIMPIAR' }));
    await userEvent.click(e.getByRole('button', { name: 'DOM' }));
    await userEvent.click(e.getByRole('button', { name: 'CERRADO' }));
    expect(resumen().getByText(/Lunes:/).parentElement).toHaveTextContent('10:00 a 13:00 y 14:00 a 18:00');
    expect(e.getByText('Hay cambios sin guardar.')).toBeInTheDocument();
    await userEvent.click(e.getByRole('button', { name: 'GUARDAR HORARIO' }));
    expect(await e.findByText(/Horario guardado como dato manual/)).toBeInTheDocument();
    const enviado = guardarHorario.mock.calls[0]?.[1] as { dia: number; cerrado: boolean; tramos: unknown[] }[];
    expect(enviado.map((d) => d.dia)).toEqual([1, 2, 3, 4, 5, 0]);
    expect(enviado[0]).toEqual({ dia: 1, cerrado: false, tramos: [{ desde: 600, hasta: 780 }, { desde: 840, hasta: 1080 }] });
    expect(enviado[5]).toEqual({ dia: 0, cerrado: true, tramos: [] });
  });

  it('sin elegir días avisa; «otro horario» acepta horas a mano y colación', async () => {
    const editor = await abrir();
    const e = within(editor);
    await userEvent.click(e.getByRole('button', { name: 'CERRADO' }));
    expect(await e.findByText(/Primero elige a qué días/)).toBeInTheDocument();
    await userEvent.click(e.getByRole('button', { name: 'SÁB' }));
    await userEvent.click(e.getByRole('button', { name: 'OTRO HORARIO' }));
    await userEvent.clear(e.getByLabelText('Abre a las', { selector: 'input' }));
    await userEvent.type(e.getByLabelText('Abre a las', { selector: 'input' }), '07:30');
    await userEvent.clear(e.getByLabelText('Cierra a las', { selector: 'input' }));
    await userEvent.type(e.getByLabelText('Cierra a las', { selector: 'input' }), '15:00');
    await userEvent.type(e.getByLabelText('Colación desde (opcional)'), '12:00');
    await userEvent.type(e.getByLabelText('Colación hasta (opcional)'), '12:45');
    await userEvent.click(e.getByRole('button', { name: 'APLICAR A LOS DÍAS ELEGIDOS' }));
    expect(resumen().getByText(/Sábado:/).parentElement).toHaveTextContent('07:30 a 12:00 y 12:45 a 15:00');
  });

  it('una colación que no cabe en el horario se informa y no se aplica', async () => {
    const editor = await abrir();
    const e = within(editor);
    await userEvent.click(e.getByRole('button', { name: 'LUN' }));
    await userEvent.click(e.getByRole('button', { name: 'Abre a las 13:00' }));
    await userEvent.click(e.getByRole('button', { name: 'Colación de 13:00 a 14:00' }));
    expect(await e.findByRole('alert')).toHaveTextContent('No se pudo aplicar en: lunes');
    expect(resumen().getByText(/Lunes:/).parentElement).toHaveTextContent('Abre a las 13:00');
  });

  it('un error al guardar se muestra y deja los cambios sin guardar', async () => {
    const editor = await abrir({ guardarHorario: () => Promise.resolve(http(422, { codigo: 'VALIDACION', mensaje: 'El lunes: los tramos se solapan.' })) });
    const e = within(editor);
    await userEvent.click(e.getByRole('button', { name: 'LUN' }));
    await userEvent.click(e.getByRole('button', { name: 'CERRADO' }));
    await userEvent.click(e.getByRole('button', { name: 'GUARDAR HORARIO' }));
    expect(await e.findByRole('alert')).toHaveTextContent('El lunes: los tramos se solapan.');
    expect(e.getByRole('button', { name: 'GUARDAR HORARIO' })).toBeEnabled();
  });
});

describe('pin del local', () => {
  const local = { id: 'l1', clienteId: 'c1', razonSocial: 'Kiosko', direccion: 'Calle 1', comuna: 'Maipú', pinEstado: 'pendiente' as const };
  it('guarda la ubicación pegada desde Google Maps y rechaza lo que no se entiende', async () => {
    const actualizarLocal = vi.fn(() => Promise.resolve(ok(undefined)));
    montar({ ruta: '/clientes/l1', sesion: DESPACHADOR, api: { obtenerLocal: () => Promise.resolve(ok(local)), actualizarLocal } });
    const campo = await screen.findByLabelText('Ubicación del local (pin)');
    await userEvent.type(campo, 'cerca de la plaza');
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR UBICACIÓN' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No entendí las coordenadas');
    expect(actualizarLocal).not.toHaveBeenCalled();
    await userEvent.clear(campo);
    await userEvent.type(campo, '-33.5123, -70.7001');
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR UBICACIÓN' }));
    expect(await screen.findByText('Ubicación guardada.')).toBeInTheDocument();
    expect(actualizarLocal).toHaveBeenCalledWith('l1', { lat: -33.5123, lng: -70.7001 });
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
    expect(await screen.findByText('2 filas detectadas. El servidor revisará cada una al importar.')).toBeInTheDocument();
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

describe('facturas del día', () => {
  const CAMION = { id: 'c1', patente: 'AB1234', alias: 'Camión 3', activo: true };
  const RABET = { localId: 'l1', clienteId: 'k1', razonSocial: 'Minimarket Rabet', direccion: 'Calle 1 123', comuna: 'Maipú', pinEstado: 'validado' as const };
  const FACTURA = { id: 'f1', folio: '1001', fecha: '2026-10-05', estado: 'pendiente' as const, urgente: true, antesDeMin: 810, camion: { id: 'c1', patente: 'AB1234', alias: 'Camión 3' }, local: { id: 'l1', razonSocial: 'Minimarket Rabet', direccion: 'Calle 1 123', comuna: 'Maipú', tienePin: true } };

  it('ingresa una factura con camión, cliente y condiciones; conserva el camión para la siguiente', async () => {
    const registrarFactura = vi.fn(() => Promise.resolve(ok(FACTURA)));
    const listarFacturas = vi.fn(() => Promise.resolve(ok([] as never[])));
    montar({ ruta: '/facturas', sesion: DESPACHADOR, api: { listarCamiones: () => Promise.resolve(ok([CAMION])), listarFacturas, registrarFactura, buscarClientes: () => Promise.resolve(ok([RABET])) } });
    await screen.findByRole('option', { name: 'Camión 3 · AB·1234' });
    await userEvent.selectOptions(screen.getByLabelText('Camión'), 'c1');
    await userEvent.type(screen.getByLabelText('Cliente'), 'rabe');
    await userEvent.click(await screen.findByRole('button', { name: /Minimarket Rabet/ }));
    await userEvent.type(screen.getByLabelText('Número de factura (folio)'), '1001');
    await userEvent.type(screen.getByLabelText('Entregar antes de (opcional)'), '13:30');
    await userEvent.click(screen.getByLabelText('Urgente'));
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR FACTURA' }));
    expect(await screen.findByText('Factura 1001 guardada para Minimarket Rabet.')).toBeInTheDocument();
    expect(registrarFactura).toHaveBeenCalledWith({ folio: '1001', localId: 'l1', fecha: '2026-10-05', camionId: 'c1', antesDeMin: 810, urgente: true });
    expect(screen.getByLabelText('Camión')).toHaveValue('c1');
    expect(screen.getByLabelText('Número de factura (folio)')).toHaveValue('');
    expect(screen.getByLabelText('Cliente')).toBeInTheDocument(); // listo para elegir otro cliente
    expect(listarFacturas).toHaveBeenCalledTimes(2);
  });

  it('un folio repetido muestra el aviso de la API y no limpia lo escrito', async () => {
    const registrarFactura = vi.fn(() => Promise.resolve(http(409, { codigo: 'CONFLICTO', mensaje: 'Ya existe una factura con el folio 1001.' })));
    montar({ ruta: '/facturas', sesion: DESPACHADOR, api: { listarCamiones: () => Promise.resolve(ok([CAMION])), listarFacturas: () => Promise.resolve(ok([])), registrarFactura, buscarClientes: () => Promise.resolve(ok([RABET])) } });
    await userEvent.type(await screen.findByLabelText('Cliente'), 'rabe');
    await userEvent.click(await screen.findByRole('button', { name: /Minimarket Rabet/ }));
    await userEvent.type(screen.getByLabelText('Número de factura (folio)'), '1001');
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR FACTURA' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una factura con el folio 1001.');
    expect(screen.getByLabelText('Número de factura (folio)')).toHaveValue('1001');
  });

  it('sin cliente elegido pide elegirlo y no llama a la API', async () => {
    const registrarFactura = vi.fn();
    montar({ ruta: '/facturas', sesion: DESPACHADOR, api: { listarCamiones: () => Promise.resolve(ok([])), listarFacturas: () => Promise.resolve(ok([])), registrarFactura } });
    await userEvent.type(await screen.findByLabelText('Número de factura (folio)'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR FACTURA' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Elige el cliente.');
    expect(registrarFactura).not.toHaveBeenCalled();
  });

  it('«Mañana» pide las facturas del día siguiente en hora de Chile', async () => {
    const listarFacturas = vi.fn(() => Promise.resolve(ok([])));
    montar({ ruta: '/facturas', sesion: ADMIN, api: { listarCamiones: () => Promise.resolve(ok([])), listarFacturas } });
    await userEvent.selectOptions(await screen.findByLabelText('Día de reparto'), 'manana');
    await waitFor(() => { expect(listarFacturas).toHaveBeenLastCalledWith({ fecha: '2026-10-06' }); });
    expect(screen.getByText(/Se reparte el martes, 6 de octubre/)).toBeInTheDocument();
  });

  it('agrupa por camión, muestra condiciones y permite cambiar de camión o anular', async () => {
    const actualizarFactura = vi.fn(() => Promise.resolve(ok(FACTURA)));
    const listarFacturas = vi.fn(() => Promise.resolve(ok([FACTURA])));
    montar({ ruta: '/facturas', sesion: DESPACHADOR, api: { listarCamiones: () => Promise.resolve(ok([CAMION])), listarFacturas, actualizarFactura } });
    const grupo = await screen.findByRole('region', { name: 'Camión 3 · AB·1234' });
    expect(within(grupo).getByText('URGENTE')).toBeInTheDocument();
    expect(within(grupo).getByText('ANTES DE 13:30')).toBeInTheDocument();
    await userEvent.selectOptions(within(grupo).getByLabelText('Camión de la factura 1001'), '');
    await waitFor(() => { expect(actualizarFactura).toHaveBeenCalledWith('f1', { camionId: null }); });
    await userEvent.click(within(grupo).getByRole('button', { name: 'ANULAR 1001' }));
    await waitFor(() => { expect(actualizarFactura).toHaveBeenCalledWith('f1', { estado: 'anulada' }); });
  });

  it('el chofer no entra a /facturas', async () => {
    montar({ ruta: '/facturas', sesion: CHOFER });
    expect(await screen.findByRole('heading', { name: '¿Qué camión manejas hoy?' })).toBeInTheDocument();
  });
});

describe('camiones', () => {
  it('agrega un camión por su patente y lo lista; un duplicado muestra el aviso', async () => {
    const crearCamion = vi.fn()
      .mockResolvedValueOnce(ok({ id: 'c1', patente: 'AB1234', activo: true }))
      .mockResolvedValueOnce(http(409, { codigo: 'CONFLICTO', mensaje: 'Ya existe un camión con la patente AB·1234.' }));
    const listarCamiones = vi.fn(() => Promise.resolve(ok([{ id: 'c1', patente: 'AB1234', alias: 'Camión 3', activo: true }])));
    montar({ ruta: '/admin/camiones', sesion: ADMIN, api: { listarCamiones, crearCamion } });
    expect(await screen.findByText('AB·1234')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Patente'), 'ab 1234');
    await userEvent.click(screen.getByRole('button', { name: 'AGREGAR CAMIÓN' }));
    expect(await screen.findByText('Camión AB·1234 agregado.')).toBeInTheDocument();
    expect(crearCamion).toHaveBeenCalledWith({ patente: 'ab 1234' });
    await userEvent.type(screen.getByLabelText('Patente'), 'AB1234');
    await userEvent.click(screen.getByRole('button', { name: 'AGREGAR CAMIÓN' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe un camión');
  });

  it('saca un camión de servicio', async () => {
    const actualizarCamion = vi.fn(() => Promise.resolve(ok({ id: 'c1', patente: 'AB1234', activo: false })));
    montar({ ruta: '/admin/camiones', sesion: ADMIN, api: { listarCamiones: () => Promise.resolve(ok([{ id: 'c1', patente: 'AB1234', activo: true }])), actualizarCamion } });
    await userEvent.click(await screen.findByRole('button', { name: 'SACAR DE SERVICIO' }));
    expect(actualizarCamion).toHaveBeenCalledWith('c1', { activo: false });
  });

  it('el despachador no entra a la administración de camiones', async () => {
    montar({ ruta: '/admin/camiones', sesion: DESPACHADOR });
    expect(await screen.findByRole('heading', { name: 'Hola, Ana' })).toBeInTheDocument();
  });
});

describe('configuración del reparto', () => {
  it('muestra el aviso si falta el depósito y guarda las coordenadas pegadas desde Google Maps', async () => {
    const guardarConfig = vi.fn((c: unknown) => Promise.resolve(ok(c as never)));
    montar({ ruta: '/admin/configuracion', sesion: ADMIN, api: { obtenerConfig: () => Promise.resolve(ok({ salidaPorDefectoMin: 480, horaLimiteRegresoMin: 1260 })), guardarConfig } });
    expect(await screen.findByText(/Falta el depósito/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Ubicación del depósito'), '-33.5123, -70.7001');
    await userEvent.type(screen.getByLabelText('Nombre del depósito (opcional)'), 'Bodega Central');
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR' }));
    expect(await screen.findByText('Configuración guardada.')).toBeInTheDocument();
    expect(guardarConfig).toHaveBeenCalledWith({ deposito: { lat: -33.5123, lng: -70.7001, nombre: 'Bodega Central' }, salidaPorDefectoMin: 480, horaLimiteRegresoMin: 1260 });
  });

  it('coordenadas que no se entienden o fuera de la RM no se envían', async () => {
    const guardarConfig = vi.fn();
    montar({ ruta: '/admin/configuracion', sesion: ADMIN, api: { obtenerConfig: () => Promise.resolve(ok({ salidaPorDefectoMin: 480, horaLimiteRegresoMin: 1260 })), guardarConfig } });
    await userEvent.type(await screen.findByLabelText('Ubicación del depósito'), '-41.47, -72.94');
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR' }));
    expect(await screen.findByText(/No entendí las coordenadas/)).toBeInTheDocument();
    expect(guardarConfig).not.toHaveBeenCalled();
  });

  it('carga lo guardado: coordenadas, nombre y horas', async () => {
    montar({ ruta: '/admin/configuracion', sesion: ADMIN, api: { obtenerConfig: () => Promise.resolve(ok({ deposito: { lat: -33.5, lng: -70.7, nombre: 'Bodega' }, salidaPorDefectoMin: 450, horaLimiteRegresoMin: 1230 })) } });
    expect(await screen.findByLabelText('Ubicación del depósito')).toHaveValue('-33.5, -70.7');
    expect(screen.getByLabelText('Hora de salida habitual')).toHaveValue('07:30');
    expect(screen.getByLabelText('Avisar si el regreso pasa de las')).toHaveValue('20:30');
  });
});

describe('rutas del día', () => {
  const CAMION = { id: 'c1', patente: 'AB1234', alias: 'Camión 3', activo: true };
  const item = (n: string, extra: object = {}) => ({ facturaId: `f${n}`, folio: `100${n}`, localId: `l${n}`, cliente: `Local ${n}`, direccion: `Calle ${n}`, comuna: 'Maipú', urgente: false, ...extra });
  const parada = (n: string, pos: number, extra: object = {}) => ({ ...item(n), posicion: pos, llegada: 540 + pos * 20, inicioServicio: 540 + pos * 20, salida: 548 + pos * 20, espera: 0, atraso: 0, motivos: ['MENOR_DESVIO' as const], fijada: false, ...extra });
  const vista = (extra: object = {}) => ({ camionId: 'c1', fecha: '2026-10-05', planificada: true, modo: 'sugerida' as const, version: 1, salidaMin: 480, horaLimiteRegresoMin: 1260, regreso: 700, regresoTardio: false, paradas: [parada('A', 0), parada('B', 1), parada('C', 2)], nuevas: [], sinPin: [], noAtendidas: [], enRiesgo: [], ...extra });
  const base = (api: Partial<ApiClient>) => ({ listarCamiones: () => Promise.resolve(ok([CAMION])), ...api });
  const elegirCamion = async () => {
    await screen.findByRole('option', { name: 'Camión 3 · AB·1234' });
    await userEvent.selectOptions(screen.getByLabelText('Camión'), 'c1');
  };

  it('muestra la ruta con horas de llegada, resumen y motivos', async () => {
    const verRuta = vi.fn(() => Promise.resolve(ok(vista({ paradas: [parada('A', 0, { motivos: ['VENTANA_DURA', 'CERCANIA_COMUNA'], antesDeMin: 720, urgente: true }), parada('B', 1)] }))));
    montar({ ruta: '/rutas', sesion: DESPACHADOR, api: base({ verRuta }) });
    await elegirCamion();
    const primera = await screen.findByRole('listitem', { name: 'Parada 1' });
    expect(within(primera).getByText('1. Local A')).toBeInTheDocument();
    expect(within(primera).getByText('09:00')).toBeInTheDocument();
    expect(within(primera).getByText('URGENTE')).toBeInTheDocument();
    expect(within(primera).getByText('ANTES DE 12:00')).toBeInTheDocument();
    expect(within(primera).getByText('Cierra pronto · Queda cerca de la anterior')).toBeInTheDocument();
    expect(screen.getByLabelText('Resumen de la ruta')).toHaveTextContent('Regreso estimado: 11:40');
    expect(verRuta).toHaveBeenCalledWith('c1', '2026-10-05');
  });

  it('un regreso tardío se marca con un aviso', async () => {
    montar({ ruta: '/rutas', sesion: DESPACHADOR, api: base({ verRuta: () => Promise.resolve(ok(vista({ regreso: 1300, regresoTardio: true }))) }) });
    await elegirCamion();
    expect(await screen.findByText(/El regreso pasa de las 21:00/)).toBeInTheDocument();
  });

  it('sin ruta calculada ofrece calcularla y muestra el resultado', async () => {
    const planificarRuta = vi.fn(() => Promise.resolve(ok(vista())));
    montar({ ruta: '/rutas', sesion: DESPACHADOR, api: base({ verRuta: () => Promise.resolve(ok(vista({ planificada: false, paradas: [], nuevas: [item('A'), item('B')], version: undefined, modo: undefined, regreso: undefined }))), planificarRuta }) });
    await elegirCamion();
    expect(await screen.findByText(/Hay 2 facturas por ordenar/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'CALCULAR RUTA SUGERIDA' }));
    expect(await screen.findByRole('listitem', { name: 'Parada 3' })).toBeInTheDocument();
    expect(planificarRuta).toHaveBeenCalledWith('c1', '2026-10-05');
  });

  it('SUBIR y BAJAR mandan la operación con la versión y muestran el orden nuevo; los extremos están deshabilitados', async () => {
    const operarRuta = vi.fn(() => Promise.resolve(ok(vista({ version: 2, modo: 'manual' as const, paradas: [parada('B', 0), parada('A', 1), parada('C', 2)] }))));
    montar({ ruta: '/rutas', sesion: DESPACHADOR, api: base({ verRuta: () => Promise.resolve(ok(vista())), operarRuta }) });
    await elegirCamion();
    await screen.findByRole('listitem', { name: 'Parada 1' });
    expect(screen.getByRole('button', { name: 'SUBIR 100A' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'BAJAR 100C' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'SUBIR 100B' }));
    expect(operarRuta).toHaveBeenCalledWith('c1', '2026-10-05', 1, { tipo: 'subir', facturaId: 'fB' });
    expect(await screen.findByText('1. Local B')).toBeInTheDocument();
    expect(screen.getByText('ACOMODADA A MANO')).toBeInTheDocument();
  });

  it('IR PRIMERO, DEJAR PARA DESPUÉS y QUITAR están en «MÁS»', async () => {
    const operarRuta = vi.fn(() => Promise.resolve(ok(vista({ version: 2 }))));
    montar({ ruta: '/rutas', sesion: DESPACHADOR, api: base({ verRuta: () => Promise.resolve(ok(vista())), operarRuta }) });
    await elegirCamion();
    expect(screen.queryByRole('button', { name: 'IR PRIMERO 100C' })).toBeNull();
    await userEvent.click(await screen.findByRole('button', { name: 'MÁS OPCIONES 100C' }));
    await userEvent.click(screen.getByRole('button', { name: 'IR PRIMERO 100C' }));
    expect(operarRuta).toHaveBeenLastCalledWith('c1', '2026-10-05', 1, { tipo: 'primero', facturaId: 'fC' });
    await userEvent.click(screen.getByRole('button', { name: 'MÁS OPCIONES 100B' }));
    await userEvent.click(screen.getByRole('button', { name: 'QUITAR DEL CAMIÓN 100B' }));
    expect(operarRuta).toHaveBeenLastCalledWith('c1', '2026-10-05', 2, { tipo: 'quitar', facturaId: 'fB' });
  });

  it('las facturas nuevas se pueden insertar sin mover lo demás; las sin pin llevan a fijar el pin', async () => {
    const operarRuta = vi.fn(() => Promise.resolve(ok(vista({ version: 2 }))));
    montar({ ruta: '/rutas', sesion: DESPACHADOR, api: base({ verRuta: () => Promise.resolve(ok(vista({ nuevas: [item('N')], sinPin: [item('P')] }))), operarRuta }) });
    await elegirCamion();
    const nuevas = await screen.findByRole('region', { name: 'Facturas nuevas sin ordenar' });
    expect(within(nuevas).getByText('Local N')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'FIJAR EL PIN DE Local P' })).toHaveAttribute('href', '/clientes/lP');
    await userEvent.click(screen.getByRole('button', { name: 'INSERTAR NUEVAS SIN MOVER LO DEMÁS' }));
    expect(operarRuta).toHaveBeenCalledWith('c1', '2026-10-05', 1, { tipo: 'insertar' });
  });

  it('volver a calcular desde cero pide confirmar antes de descartar el orden', async () => {
    const planificarRuta = vi.fn(() => Promise.resolve(ok(vista({ version: 3 }))));
    montar({ ruta: '/rutas', sesion: DESPACHADOR, api: base({ verRuta: () => Promise.resolve(ok(vista({ modo: 'manual' as const }))), planificarRuta }) });
    await elegirCamion();
    await userEvent.click(await screen.findByRole('button', { name: 'VOLVER A CALCULAR DESDE CERO' }));
    expect(screen.getByText(/incluido lo que acomodaste a mano/)).toBeInTheDocument();
    expect(planificarRuta).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'SÍ, RECALCULAR' }));
    await waitFor(() => { expect(planificarRuta).toHaveBeenCalledTimes(1); });
  });

  it('si otra persona cambió la ruta (409) avisa y recarga la versión nueva', async () => {
    const verRuta = vi.fn()
      .mockResolvedValueOnce(ok(vista()))
      .mockResolvedValueOnce(ok(vista({ version: 5, paradas: [parada('C', 0), parada('A', 1), parada('B', 2)] })));
    const operarRuta = vi.fn(() => Promise.resolve(http(409, { codigo: 'CONFLICTO', mensaje: 'Otra persona cambió esta ruta. Recarga para ver la versión nueva.', detalle: { codigo: 'RUTA_DESACTUALIZADA' } })));
    montar({ ruta: '/rutas', sesion: DESPACHADOR, api: base({ verRuta, operarRuta }) });
    await elegirCamion();
    await userEvent.click(await screen.findByRole('button', { name: 'SUBIR 100B' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Otra persona cambió esta ruta');
    expect(await screen.findByText('1. Local C')).toBeInTheDocument();
    expect(verRuta).toHaveBeenCalledTimes(2);
  });

  it('sin depósito configurado lleva a la configuración', async () => {
    montar({ ruta: '/rutas', sesion: DESPACHADOR, api: base({ verRuta: () => Promise.resolve(http(422, { codigo: 'VALIDACION', mensaje: 'x', detalle: { codigo: 'SIN_DEPOSITO' } })) }) });
    await elegirCamion();
    expect(await screen.findByRole('link', { name: 'Ir a la configuración' })).toHaveAttribute('href', '/admin/configuracion');
  });

  it('el chofer no entra a /rutas', async () => {
    montar({ ruta: '/rutas', sesion: CHOFER });
    expect(await screen.findByRole('heading', { name: '¿Qué camión manejas hoy?' })).toBeInTheDocument();
  });
});

describe('el chofer: camión del día y carga de facturas', () => {
  const CAMION = { id: 'c1', patente: 'AB1234', alias: 'Camión 3', activo: true };
  const JORNADA = { id: 'j1', fecha: '2026-10-05', desde: '2026-10-05T11:00:00.000Z', camion: { id: 'c1', patente: 'AB1234', alias: 'Camión 3' } };
  const RABET = { localId: 'l1', clienteId: 'k1', razonSocial: 'Minimarket Rabet', direccion: 'Calle 1 123', comuna: 'Maipú', pinEstado: 'validado' as const };
  const FACTURA = { id: 'f1', folio: '1234', fecha: '2026-10-05', estado: 'pendiente' as const, urgente: false, camion: { id: 'c1', patente: 'AB1234' }, local: { id: 'l1', razonSocial: 'Minimarket Rabet', direccion: 'Calle 1 123', comuna: 'Maipú', tienePin: true } };

  it('sin jornada elige el camión con un toque y entra a su inicio', async () => {
    const miJornada = vi.fn().mockResolvedValueOnce(ok(null)).mockResolvedValue(ok(JORNADA));
    const iniciarJornada = vi.fn(() => Promise.resolve(ok(JORNADA)));
    montar({ sesion: CHOFER, api: { miJornada, iniciarJornada, listarCamiones: () => Promise.resolve(ok([CAMION])) } });
    await userEvent.click(await screen.findByRole('button', { name: 'Camión 3 · AB·1234' }));
    expect(iniciarJornada).toHaveBeenCalledWith('c1');
    expect(await screen.findByText('Camión Camión 3 · AB·1234')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CARGAR FACTURAS' })).toHaveAttribute('href', '/cargar');
    expect(screen.getByRole('link', { name: 'MI RUTA' })).toHaveAttribute('href', '/mi-ruta');
  });

  it('con jornada puede cambiar de camión o terminar su día', async () => {
    const terminarJornada = vi.fn(() => Promise.resolve(ok(undefined)));
    montar({ sesion: CHOFER, api: { miJornada: () => Promise.resolve(ok(JORNADA)), terminarJornada, listarCamiones: () => Promise.resolve(ok([CAMION])) } });
    await userEvent.click(await screen.findByRole('button', { name: 'CAMBIAR DE CAMIÓN' }));
    expect(await screen.findByRole('heading', { name: '¿Qué camión manejas hoy?' })).toBeInTheDocument();
  });

  it('terminar el día cierra la jornada', async () => {
    const terminarJornada = vi.fn(() => Promise.resolve(ok(undefined)));
    montar({ sesion: CHOFER, api: { miJornada: () => Promise.resolve(ok(JORNADA)), terminarJornada } });
    await userEvent.click(await screen.findByRole('button', { name: 'TERMINAR MI DÍA' }));
    expect(terminarJornada).toHaveBeenCalledTimes(1);
  });

  it('carga una factura con una línea dictada: entiende folio y cliente, y guarda al tocar el cliente', async () => {
    const registrarFactura = vi.fn(() => Promise.resolve(ok(FACTURA)));
    const buscarClientes = vi.fn(() => Promise.resolve(ok([RABET])));
    const listarFacturas = vi.fn(() => Promise.resolve(ok([] as never[])));
    montar({ ruta: '/cargar', sesion: CHOFER, api: { miJornada: () => Promise.resolve(ok(JORNADA)), registrarFactura, buscarClientes, listarFacturas } });
    await userEvent.type(await screen.findByLabelText('Factura y cliente'), 'factura número 1234 minimarket rabet');
    expect(screen.getByText('1234', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('minimarket rabet', { selector: 'strong' })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /Minimarket Rabet/ }));
    expect(buscarClientes).toHaveBeenLastCalledWith('minimarket rabet', expect.objectContaining({ limite: 6 }));
    expect(registrarFactura).toHaveBeenCalledWith({ folio: '1234', localId: 'l1', camionId: 'c1', fecha: '2026-10-05' });
    expect(await screen.findByText('Factura 1234 cargada para Minimarket Rabet.')).toBeInTheDocument();
    expect(screen.getByLabelText('Factura y cliente')).toHaveValue('');
    expect(listarFacturas).toHaveBeenCalledTimes(2);
  });

  it('sin número de factura avisa y no guarda; un folio repetido muestra el aviso de la API', async () => {
    const registrarFactura = vi.fn(() => Promise.resolve(http(409, { codigo: 'CONFLICTO', mensaje: 'Ya existe una factura con el folio 1234.' })));
    montar({ ruta: '/cargar', sesion: CHOFER, api: { miJornada: () => Promise.resolve(ok(JORNADA)), registrarFactura, buscarClientes: () => Promise.resolve(ok([RABET])), listarFacturas: () => Promise.resolve(ok([])) } });
    const campo = await screen.findByLabelText('Factura y cliente');
    await userEvent.type(campo, 'minimarket rabet');
    expect(await screen.findByText('Falta el número de factura')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /Minimarket Rabet/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falta el número de factura.');
    expect(registrarFactura).not.toHaveBeenCalled();
    await userEvent.clear(campo);
    await userEvent.type(campo, '1234 minimarket rabet');
    await userEvent.click(await screen.findByRole('button', { name: /Minimarket Rabet/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una factura con el folio 1234.');
    expect(campo).toHaveValue('1234 minimarket rabet');
  });

  it('lista lo cargado hoy con condiciones; se pueden poner «antes de», urgente y nota, o anular', async () => {
    const actualizarFactura = vi.fn(() => Promise.resolve(ok({ ...FACTURA, urgente: true })));
    montar({ ruta: '/cargar', sesion: CHOFER, api: { miJornada: () => Promise.resolve(ok(JORNADA)), listarFacturas: () => Promise.resolve(ok([FACTURA])), actualizarFactura } });
    expect(await screen.findByText('Cargadas hoy (1)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CALCULAR MI RUTA' })).toHaveAttribute('href', '/mi-ruta');
    await userEvent.click(screen.getByRole('button', { name: 'CONDICIONES 1234' }));
    await userEvent.type(screen.getByLabelText('Entregar antes de (factura 1234)'), '13:00');
    await userEvent.click(screen.getByLabelText('Urgente'));
    await userEvent.type(screen.getByLabelText('Nota (factura 1234)'), 'portón verde');
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR CONDICIONES' }));
    expect(actualizarFactura).toHaveBeenCalledWith('f1', { antesDeMin: 780, urgente: true, nota: 'portón verde' });
    await userEvent.click(screen.getByRole('button', { name: 'ANULAR 1234' }));
    expect(actualizarFactura).toHaveBeenLastCalledWith('f1', { estado: 'anulada' });
  });

  it('sin jornada, cargar y ruta mandan a elegir el camión', async () => {
    montar({ ruta: '/cargar', sesion: CHOFER });
    expect(await screen.findByText(/Primero elige el camión que manejas hoy/)).toBeInTheDocument();
  });

  it('mi ruta muestra la ruta de su camión de hoy', async () => {
    const verRuta = vi.fn(() => Promise.resolve(ok({ camionId: 'c1', fecha: '2026-10-05', planificada: false, salidaMin: 480, horaLimiteRegresoMin: 1260, paradas: [], nuevas: [], sinPin: [], noAtendidas: [], enRiesgo: [] })));
    montar({ ruta: '/mi-ruta', sesion: CHOFER, api: { miJornada: () => Promise.resolve(ok(JORNADA)), verRuta } });
    expect(await screen.findByText(/Esta ruta aún no está calculada/)).toBeInTheDocument();
    expect(verRuta).toHaveBeenCalledWith('c1', '2026-10-05');
  });

  it('el despachador no entra a /cargar ni /mi-ruta', async () => {
    montar({ ruta: '/cargar', sesion: DESPACHADOR });
    expect(await screen.findByRole('heading', { name: 'Hola, Ana' })).toBeInTheDocument();
  });
});
