import { act, render, screen, waitFor, within } from '@testing-library/react';
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
    buscarDireccion: vi.fn(() => Promise.resolve(err('SIN_RESULTADO' as const))),
    completarComunas: vi.fn(() => Promise.resolve({ comunas: {}, sinRespuesta: 0, detenido: false })),
    subirFotoLocal: vi.fn(),
    ahora: () => new Date('2026-10-05T15:00:00Z'),
    voz: { disponible: false, escuchar: () => ({ detener: () => undefined }) },
    vista: { cargar: () => 'grande' as const, guardar: () => undefined },
    tema: { cargar: () => 'claro' as const, guardar: () => undefined },
    ubicacion: { disponible: false, actual: () => Promise.resolve(err('NO_DISPONIBLE' as const)) },
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
    for (const nombre of ['FACTURAS DEL DÍA', 'RUTAS DEL DÍA', 'BUSCAR CLIENTE', 'CLIENTE NUEVO', 'PINES DE LOCALES', 'IMPORTAR CLIENTES', 'CAMIONES', 'VENDEDORES', 'CONFIGURACIÓN', 'USUARIOS']) {
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

describe('modo oscuro', () => {
  it('aplica el tema guardado y el botón de la cabecera lo cambia y lo recuerda', async () => {
    const guardar = vi.fn();
    montar({ sesion: ADMIN, casos: { tema: { cargar: () => 'claro', guardar } } });
    await screen.findByRole('heading', { name: 'Hola, Matías' });
    expect(document.documentElement.dataset['tema']).toBe('claro');
    expect(screen.getByRole('button', { name: /Cambiar a oscuro/ })).toHaveTextContent('MODO OSCURO');
    await userEvent.click(screen.getByRole('button', { name: /Cambiar a oscuro/ }));
    expect(guardar).toHaveBeenCalledWith('oscuro');
    expect(document.documentElement.dataset['tema']).toBe('oscuro');
    await userEvent.click(screen.getByRole('button', { name: /Cambiar a suave/ }));
    expect(guardar).toHaveBeenLastCalledWith('suave');
    expect(document.documentElement.dataset['tema']).toBe('suave');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? '#f1e9d6').toBe('#f1e9d6');
    expect(screen.getByRole('button', { name: /Cambiar a claro/ })).toHaveTextContent('MODO CLARO');
    await userEvent.click(screen.getByRole('button', { name: /Cambiar a claro/ }));
    expect(document.documentElement.dataset['tema']).toBe('claro');
  });

  it('sin elección previa sigue el modo del teléfono', async () => {
    const original = globalThis.matchMedia;
    globalThis.matchMedia = ((q: string) => ({ matches: q.includes('dark') })) as typeof globalThis.matchMedia;
    try {
      montar({ sesion: ADMIN, casos: { tema: { cargar: () => undefined, guardar: () => undefined } } });
      await screen.findByRole('heading', { name: 'Hola, Matías' });
      expect(document.documentElement.dataset['tema']).toBe('oscuro');
    } finally {
      globalThis.matchMedia = original;
    }
  });
});

describe('vista grande o normal', () => {
  it('la primera vez pregunta cómo ver la app; elegir NORMAL la guarda y la aplica a toda la pantalla', async () => {
    const guardar = vi.fn();
    montar({ ruta: '/entrar', casos: { vista: { cargar: () => undefined, guardar } } });
    expect(await screen.findByRole('heading', { name: '¿Cómo quieres ver la app?' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Entrar' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'NORMAL' }));
    expect(guardar).toHaveBeenCalledWith('normal');
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(document.documentElement.dataset['vista']).toBe('normal');
  });

  it('elegir GRANDE también se guarda', async () => {
    const guardar = vi.fn();
    montar({ ruta: '/entrar', casos: { vista: { cargar: () => undefined, guardar } } });
    await userEvent.click(await screen.findByRole('button', { name: 'GRANDE' }));
    expect(guardar).toHaveBeenCalledWith('grande');
    expect(document.documentElement.dataset['vista']).toBe('grande');
  });

  it('con una vista ya elegida no vuelve a preguntar, y el botón de la cabecera cambia de vista', async () => {
    const guardar = vi.fn();
    montar({ sesion: ADMIN, casos: { vista: { cargar: () => 'grande', guardar } } });
    await screen.findByRole('heading', { name: 'Hola, Matías' });
    expect(screen.queryByRole('heading', { name: '¿Cómo quieres ver la app?' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Cambiar a normal/ }));
    expect(guardar).toHaveBeenCalledWith('normal');
    expect(document.documentElement.dataset['vista']).toBe('normal');
    expect(screen.getByRole('button', { name: /Cambiar a grande/ })).toHaveTextContent('VISTA GRANDE');
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
  it('en la ficha también se pega el enlace que mandó el vendedor', async () => {
    const fijarPinDesdeEnlace = vi.fn(() => Promise.resolve(ok({ resultado: 'fijado' as const, lat: -33.5972, lng: -70.7019 })));
    montar({ ruta: '/clientes/l1', sesion: DESPACHADOR, api: { obtenerLocal: () => Promise.resolve(ok(local)), fijarPinDesdeEnlace } });
    await userEvent.type(await screen.findByLabelText('O pega el enlace que mandó el vendedor'), 'https://maps.google.com/?q=-33.5972,-70.7019');
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR UBICACIÓN DEL VENDEDOR' }));
    expect(fijarPinDesdeEnlace).toHaveBeenCalledWith('l1', 'https://maps.google.com/?q=-33.5972,-70.7019');
    expect(await screen.findByText(/Ubicación guardada. Desde ahora sirve para todos/)).toBeInTheDocument();
  });
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

  it('lista de Google Maps: la ordena, deja completar lo que falta y importa solo lo listo', async () => {
    const importarClientesEnLotes = vi.fn((filas: readonly unknown[]) => Promise.resolve(ok({ totalFilas: filas.length, validas: filas.length, errores: [], resumen: { clientesCreados: filas.length, clientesActualizados: 0, localesCreados: filas.length, localesActualizados: 0 } })));
    montar({ ruta: '/admin/importar', sesion: ADMIN, casos: { importarClientesEnLotes } });
    await userEvent.click(await screen.findByLabelText('O pega aquí la planilla'));
    await userEvent.paste([
      'Pin colocado', '-33.606873,-70.917985', 'rosa gonzalez osses', 'camino mallarauco 16', '', '',
      'Pin colocado', 'Cerca de Av. Hernán Prieto, Pirque, Región Metropolitana', 'olga aguilera toledo', 'avenida concha y toro 4089', '', '',
      'Pin colocado', 'Cerca de Paine, Región Metropolitana', 'Gisela Carrasco',
    ].join('\n'));
    const panel = await screen.findByRole('region', { name: 'Lista de Google Maps' });
    expect(within(panel).getByText(/3 lugares leídos. Listos: 1 · solo con una referencia «Cerca de…»: 0 · para revisar: 2/)).toBeInTheDocument();
    expect(within(panel).getByText(/repetidos \(se unieron con otro\): 0/)).toBeInTheDocument();
    expect(within(panel).getByText(/no trae las coordenadas de 2 lugares/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Comuna #1'), 'Melipilla');
    expect(screen.queryByRole('button', { name: 'ACEPTAR LA COMUNA MÁS CERCANA EN 1' })).toBeNull();
    await waitFor(() => { expect(within(screen.getByRole('region', { name: 'Lista de Google Maps' })).getByText(/Listos: 2/)).toBeInTheDocument(); });
    await userEvent.click(screen.getByRole('button', { name: 'IMPORTAR 2 CLIENTES' }));
    await screen.findByRole('region', { name: 'Resultado de la importación' });
    expect(importarClientesEnLotes.mock.calls[0]?.[0]).toEqual([
      { razonSocial: 'Rosa Gonzalez Osses', direccion: 'Camino Mallarauco 16', comuna: 'Melipilla', lat: '-33.606873', lng: '-70.917985' },
      { razonSocial: 'Olga Aguilera Toledo', direccion: 'Avenida Concha y Toro 4089', comuna: 'Pirque', nota: 'Cerca de Av. Hernán Prieto' },
    ]);
  });

  it('lista de Google Maps: un pin entre dos comunas ofrece las dos con un toque y un botón para aceptar la más cercana en todos', async () => {
    montar({ ruta: '/admin/importar', sesion: ADMIN, casos: { importarClientesEnLotes: vi.fn() } });
    await userEvent.click(await screen.findByLabelText('O pega aquí la planilla'));
    await userEvent.paste(['Pin colocado', '-33.606873,-70.917985', 'rosa gonzalez osses', '', '', 'Pin colocado', '-33.606873,-70.917985', 'juan perez soto'].join('\n'));
    const aceptar = await screen.findByRole('button', { name: 'ACEPTAR LA COMUNA MÁS CERCANA EN 2' });
    expect(screen.getAllByText(/el pin está entre Peñaflor y Talagante/)).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'USAR Talagante en #1' }));
    expect(screen.getByLabelText('Comuna #2')).toHaveValue('');
    await userEvent.click(screen.getByRole('button', { name: 'ACEPTAR LA COMUNA MÁS CERCANA EN 1' }));
    expect(await screen.findByRole('button', { name: 'IMPORTAR 2 CLIENTES' })).toBeEnabled();
    expect(aceptar).not.toBeInTheDocument();
  });

  it('lista de Google Maps: busca la comuna de los pines en OpenStreetMap, y deja omitir los que no tienen nombre', async () => {
    const completarComunas = vi.fn(() => Promise.resolve({ comunas: { 1: 'Melipilla' }, sinRespuesta: 0, detenido: false }));
    montar({ ruta: '/admin/importar', sesion: ADMIN, casos: { importarClientesEnLotes: vi.fn(), completarComunas } });
    await userEvent.click(await screen.findByLabelText('O pega aquí la planilla'));
    await userEvent.paste(['Pin colocado', '-33.606873,-70.917985', 'rosa gonzalez osses', '', '', 'Eliodoro Yañez 1909', '8082075 San Bernardo', 'Región Metropolitana'].join('\n'));
    expect(await screen.findByText(/Solo se envían las coordenadas, nunca nombres ni direcciones/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'BUSCAR LA COMUNA DE 1 PINES (OPENSTREETMAP)' }));
    expect(completarComunas).toHaveBeenCalledWith([{ numero: 1, lat: -33.606873, lng: -70.917985 }], expect.any(Function));
    expect(await screen.findByText('Listo: se encontró la comuna de 1.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Para revisar 1')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'OMITIR LOS 1 SIN NOMBRE' }));
    expect(screen.queryByLabelText('Para revisar 2')).toBeNull();
    expect(screen.getByRole('button', { name: 'IMPORTAR 1 CLIENTES' })).toBeEnabled();
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
    await userEvent.type(screen.getByLabelText('Número de factura (opcional)'), '1001');
    await userEvent.type(screen.getByLabelText('Entregar antes de (opcional)'), '13:30');
    await userEvent.click(screen.getByLabelText('Urgente'));
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR FACTURA' }));
    expect(await screen.findByText('Entrega guardada para Minimarket Rabet.')).toBeInTheDocument();
    expect(registrarFactura).toHaveBeenCalledWith({ folio: '1001', localId: 'l1', fecha: '2026-10-05', camionId: 'c1', antesDeMin: 810, urgente: true });
    expect(screen.getByLabelText('Camión')).toHaveValue('c1');
    expect(screen.getByLabelText('Número de factura (opcional)')).toHaveValue('');
    expect(screen.getByLabelText('Cliente')).toBeInTheDocument(); // listo para elegir otro cliente
    expect(listarFacturas).toHaveBeenCalledTimes(2);
  });

  it('un folio repetido muestra el aviso de la API y no limpia lo escrito', async () => {
    const registrarFactura = vi.fn(() => Promise.resolve(http(409, { codigo: 'CONFLICTO', mensaje: 'Ya existe una factura con el folio 1001.' })));
    montar({ ruta: '/facturas', sesion: DESPACHADOR, api: { listarCamiones: () => Promise.resolve(ok([CAMION])), listarFacturas: () => Promise.resolve(ok([])), registrarFactura, buscarClientes: () => Promise.resolve(ok([RABET])) } });
    await userEvent.type(await screen.findByLabelText('Cliente'), 'rabe');
    await userEvent.click(await screen.findByRole('button', { name: /Minimarket Rabet/ }));
    await userEvent.type(screen.getByLabelText('Número de factura (opcional)'), '1001');
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR FACTURA' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una factura con el folio 1001.');
    expect(screen.getByLabelText('Número de factura (opcional)')).toHaveValue('1001');
  });

  it('sin cliente elegido pide elegirlo y no llama a la API', async () => {
    const registrarFactura = vi.fn();
    montar({ ruta: '/facturas', sesion: DESPACHADOR, api: { listarCamiones: () => Promise.resolve(ok([])), listarFacturas: () => Promise.resolve(ok([])), registrarFactura } });
    await userEvent.type(await screen.findByLabelText('Número de factura (opcional)'), '1');
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
    await userEvent.selectOptions(within(grupo).getByLabelText('Camión de Minimarket Rabet'), '');
    await waitFor(() => { expect(actualizarFactura).toHaveBeenCalledWith('f1', { camionId: null }); });
    await userEvent.click(within(grupo).getByRole('button', { name: 'ANULAR Minimarket Rabet' }));
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

  it('cambia el nombre de un camión (y lo borra si se deja vacío)', async () => {
    const actualizarCamion = vi.fn(() => Promise.resolve(ok({ id: 'c1', patente: 'SDTS23', alias: '23 nuevo', activo: true })));
    montar({ ruta: '/admin/camiones', sesion: ADMIN, api: { listarCamiones: () => Promise.resolve(ok([{ id: 'c1', patente: 'SDTS23', alias: '23', activo: true }])), actualizarCamion } });
    await userEvent.click(await screen.findByRole('button', { name: 'CAMBIAR NOMBRE SDTS·23' }));
    const campo = screen.getByLabelText('Nombre del camión SDTS·23');
    expect(campo).toHaveValue('23');
    await userEvent.clear(campo);
    await userEvent.type(campo, '23 nuevo');
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR NOMBRE' }));
    await waitFor(() => { expect(actualizarCamion).toHaveBeenCalledWith('c1', { alias: '23 nuevo' }); });
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

describe('buscar pines por dirección (admin)', () => {
  it('muestra cuántos locales siguen sin pin, pide la búsqueda y sigue el avance', async () => {
    const buscarPinesPendientes = vi.fn(() => Promise.resolve(ok({ encolados: 40, sinPin: 40, enCola: 40, enMarcha: true })));
    const estadoBusquedaPines = vi.fn()
      .mockResolvedValueOnce(ok({ sinPin: 40, enCola: 0, enMarcha: false }))
      .mockResolvedValue(ok({ sinPin: 12, enCola: 0, enMarcha: false }));
    montar({ ruta: '/admin/importar', sesion: ADMIN, api: { buscarPinesPendientes, estadoBusquedaPines } });
    expect(await screen.findByText(/locales sin pin/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'BUSCAR LOS PINES POR DIRECCIÓN' }));
    expect(buscarPinesPendientes).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/se buscaron 40 direcciones. Quedan 12 sin pin/)).toBeInTheDocument();
  });
});

describe('vendedores', () => {
  it('agrega un vendedor con su celular y lo lista con el celular formateado', async () => {
    const crearVendedor = vi.fn(() => Promise.resolve(ok({ id: 'v1', codigo: 'V01', nombre: 'Ana', celular: '56912345678', activo: true })));
    const listarVendedores = vi.fn(() => Promise.resolve(ok([{ id: 'v1', codigo: 'V01', nombre: 'Ana', celular: '56912345678', activo: true }])));
    montar({ ruta: '/admin/vendedores', sesion: ADMIN, api: { listarVendedores, crearVendedor } });
    expect(await screen.findByText('+56 9 1234 5678')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Código'), 'v01');
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana');
    await userEvent.type(screen.getByLabelText('Celular (opcional)'), '9 1234 5678');
    await userEvent.click(screen.getByRole('button', { name: 'AGREGAR VENDEDOR' }));
    expect(await screen.findByText('Vendedor V01 Ana agregado.')).toBeInTheDocument();
    expect(crearVendedor).toHaveBeenCalledWith({ codigo: 'v01', nombre: 'Ana', celular: '9 1234 5678' });
  });

  it('cambia o borra el celular y desactiva', async () => {
    const actualizarVendedor = vi.fn(() => Promise.resolve(ok({ id: 'v1', codigo: 'V01', nombre: 'Ana', activo: true })));
    montar({ ruta: '/admin/vendedores', sesion: ADMIN, api: { listarVendedores: () => Promise.resolve(ok([{ id: 'v1', codigo: 'V01', nombre: 'Ana', celular: '56912345678', activo: true }])), actualizarVendedor } });
    await userEvent.click(await screen.findByRole('button', { name: 'CAMBIAR CELULAR V01' }));
    await userEvent.clear(screen.getByLabelText('Celular de V01'));
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR CELULAR' }));
    await waitFor(() => { expect(actualizarVendedor).toHaveBeenCalledWith('v1', { celular: null }); });
    await userEvent.click(screen.getByRole('button', { name: 'DESACTIVAR V01' }));
    expect(actualizarVendedor).toHaveBeenLastCalledWith('v1', { activo: false });
  });

  it('el despachador no entra a la administración de vendedores', async () => {
    montar({ ruta: '/admin/vendedores', sesion: DESPACHADOR });
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
  const vista = (extra: object = {}) => ({ camionId: 'c1', fecha: '2026-10-05', planificada: true, modo: 'sugerida' as const, version: 1, salidaMin: 480, horaLimiteRegresoMin: 1260, regreso: 700, regresoTardio: false, paradas: [parada('A', 0), parada('B', 1), parada('C', 2)], nuevas: [], hechas: [], sinPin: [], noAtendidas: [], enRiesgo: [], ...extra });
  const base = (api: Partial<ApiClient>) => ({ listarCamiones: () => Promise.resolve(ok([CAMION])), ...api });
  const elegirCamion = async () => {
    await screen.findByRole('option', { name: 'Camión 3 · AB·1234' });
    await userEvent.selectOptions(screen.getByLabelText('Camión'), 'c1');
  };
  /** La lista de paradas se despliega al tocar una fila; solo una abierta a la vez (la siguiente viene abierta). */
  const desplegar = async (n: number) => {
    const fila = await screen.findByRole('listitem', { name: `Parada ${n}` });
    await userEvent.click(within(fila).getByRole('button', { expanded: false }));
  };

  it('muestra la ruta con horas de llegada, resumen y motivos', async () => {
    const verRuta = vi.fn(() => Promise.resolve(ok(vista({ paradas: [parada('A', 0, { motivos: ['VENTANA_DURA', 'CERCANIA_COMUNA'], antesDeMin: 720, urgente: true }), parada('B', 1)] }))));
    montar({ ruta: '/rutas', sesion: DESPACHADOR, api: base({ verRuta }) });
    await elegirCamion();
    const primera = await screen.findByRole('listitem', { name: 'Parada 1' });
    expect(within(primera).getByText('Local A')).toBeInTheDocument();
    expect(within(primera).getAllByText('09:00').length).toBeGreaterThan(0);
    expect(within(primera).getAllByText('URGENTE').length).toBeGreaterThan(0);
    expect(within(primera).getByText('SIGUIENTE')).toBeInTheDocument();
    expect(within(primera).getByText('ANTES DE 12:00')).toBeInTheDocument();
    expect(within(primera).getByText('Cierra pronto · Queda cerca de la anterior')).toBeInTheDocument();
    expect(screen.getByLabelText('Resumen de la ruta')).toHaveTextContent('Regreso estimado: 11:40');
    expect(verRuta).toHaveBeenCalledWith('c1', '2026-10-05');
  });

  it('una parada que solo tiene dirección (sin nombre de cliente) muestra la dirección y la comuna, sin repetir', async () => {
    const solo = { ...parada('A', 0), cliente: 'Av. Colón 765', direccion: 'Av. Colón 765', comuna: 'San Bernardo' };
    montar({ ruta: '/rutas', sesion: DESPACHADOR, api: base({ verRuta: () => Promise.resolve(ok(vista({ paradas: [solo] }))) }) });
    await elegirCamion();
    const tarjeta = await screen.findByRole('listitem', { name: 'Parada 1' });
    expect(within(tarjeta).getByText('Av. Colón 765')).toBeInTheDocument();
    expect(within(tarjeta).getByText('San Bernardo')).toHaveClass('comuna');
    expect(within(tarjeta).getAllByText(/Av\. Colón 765/)).toHaveLength(1);
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
    expect(screen.getByRole('button', { name: 'SUBIR Local A' })).toBeDisabled();
    await desplegar(3);
    expect(screen.getByRole('button', { name: 'BAJAR Local C' })).toBeDisabled();
    await desplegar(2);
    await userEvent.click(screen.getByRole('button', { name: 'SUBIR Local B' }));
    expect(operarRuta).toHaveBeenCalledWith('c1', '2026-10-05', 1, { tipo: 'subir', facturaId: 'fB' });
    expect(within(await screen.findByRole('listitem', { name: 'Parada 1' })).getByText('Local B')).toBeInTheDocument();
    expect(screen.getByText('ACOMODADA A MANO')).toBeInTheDocument();
  });

  it('IR PRIMERO, DEJAR PARA DESPUÉS y QUITAR están en «MÁS»', async () => {
    const operarRuta = vi.fn(() => Promise.resolve(ok(vista({ version: 2 }))));
    montar({ ruta: '/rutas', sesion: DESPACHADOR, api: base({ verRuta: () => Promise.resolve(ok(vista())), operarRuta }) });
    await elegirCamion();
    expect(screen.queryByRole('button', { name: 'IR PRIMERO Local C' })).toBeNull();
    await desplegar(3);
    await userEvent.click(await screen.findByRole('button', { name: 'MÁS OPCIONES Local C' }));
    await userEvent.click(screen.getByRole('button', { name: 'IR PRIMERO Local C' }));
    expect(operarRuta).toHaveBeenLastCalledWith('c1', '2026-10-05', 1, { tipo: 'primero', facturaId: 'fC' });
    await desplegar(2);
    await userEvent.click(screen.getByRole('button', { name: 'MÁS OPCIONES Local B' }));
    await userEvent.click(screen.getByRole('button', { name: 'QUITAR DEL CAMIÓN Local B' }));
    expect(operarRuta).toHaveBeenLastCalledWith('c1', '2026-10-05', 2, { tipo: 'quitar', facturaId: 'fB' });
  });

  it('la lista viene numerada con nombre y comuna: la siguiente abierta, las demás cerradas, y solo una abierta a la vez', async () => {
    montar({ ruta: '/rutas', sesion: DESPACHADOR, api: base({ verRuta: () => Promise.resolve(ok(vista())) }) });
    await elegirCamion();
    const primera = await screen.findByRole('listitem', { name: 'Parada 1' });
    const segunda = screen.getByRole('listitem', { name: 'Parada 2' });
    expect(within(primera).getByRole('button', { name: /^Local A/ })).toHaveAttribute('aria-expanded', 'true');
    expect(within(segunda).getByRole('button', { name: /^Local B/ })).toHaveAttribute('aria-expanded', 'false');
    expect(within(segunda).queryByRole('button', { name: 'SUBIR Local B' })).toBeNull();
    expect(within(segunda).getAllByText('Maipú')[0]).toHaveClass('comuna');
    await userEvent.click(within(segunda).getByRole('button', { name: /^Local B/ }));
    expect(within(segunda).getByRole('button', { name: 'SUBIR Local B' })).toBeInTheDocument();
    expect(within(primera).queryByRole('button', { name: 'SUBIR Local A' })).toBeNull();
    await userEvent.click(within(segunda).getByRole('button', { name: /^Local B/ }));
    expect(within(segunda).queryByRole('button', { name: 'SUBIR Local B' })).toBeNull();
  });

  it('una parada sin pin exacto avisa que es aproximada y lleva a fijar el pin', async () => {
    montar({ ruta: '/rutas', sesion: DESPACHADOR, api: base({ verRuta: () => Promise.resolve(ok(vista({ paradas: [parada('A', 0, { ubicacionAproximada: true, localId: 'lA' })] }))) }) });
    await elegirCamion();
    const fila = await screen.findByRole('listitem', { name: 'Parada 1' });
    expect(within(fila).getByText(/Ubicación aproximada/)).toBeInTheDocument();
    expect(within(fila).getByRole('link', { name: 'Fijar el pin' })).toHaveAttribute('href', '/clientes/lA');
  });

  it('al volver a la app (por ejemplo desde Waze) la ruta se pide de nuevo para actualizar las horas', async () => {
    const verRuta = vi.fn(() => Promise.resolve(ok(vista())));
    montar({ ruta: '/rutas', sesion: DESPACHADOR, api: base({ verRuta }) });
    await elegirCamion();
    await screen.findByRole('listitem', { name: 'Parada 1' });
    expect(screen.getByText(/Actualizada a las/)).toBeInTheDocument();
    const llamadas = verRuta.mock.calls.length;
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => { expect(verRuta.mock.calls.length).toBeGreaterThan(llamadas); });
  });

  it('las facturas nuevas se pueden insertar sin mover lo demás; las sin pin llevan a fijar el pin', async () => {
    const operarRuta = vi.fn(() => Promise.resolve(ok(vista({ version: 2 }))));
    montar({ ruta: '/rutas', sesion: DESPACHADOR, api: base({ verRuta: () => Promise.resolve(ok(vista({ nuevas: [item('N')], sinPin: [item('P')] }))), operarRuta }) });
    await elegirCamion();
    const nuevas = await screen.findByRole('region', { name: 'Entregas nuevas sin ordenar' });
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
    await desplegar(2);
    await userEvent.click(await screen.findByRole('button', { name: 'SUBIR Local B' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Otra persona cambió esta ruta');
    expect(within(await screen.findByRole('listitem', { name: 'Parada 1' })).getByText('Local C')).toBeInTheDocument();
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

describe('el chofer: camión del día y carga de entregas', () => {
  const CAMION = { id: 'c1', patente: 'AB1234', alias: 'Camión 3', activo: true };
  const JORNADA = { id: 'j1', fecha: '2026-10-05', desde: '2026-10-05T11:00:00.000Z', camion: { id: 'c1', patente: 'AB1234', alias: 'Camión 3' } };
  const RABET = { localId: 'l1', clienteId: 'k1', razonSocial: 'Minimarket Rabet', direccion: 'Calle 1 123', comuna: 'Maipú', pinEstado: 'validado' as const };
  const FACTURA = { id: 'f1', fecha: '2026-10-05', estado: 'pendiente' as const, urgente: false, camion: { id: 'c1', patente: 'AB1234' }, local: { id: 'l1', razonSocial: 'Minimarket Rabet', direccion: 'Calle 1 123', comuna: 'Maipú', tienePin: true } };
  const baseApi = (extra: Partial<ApiClient> = {}): Partial<ApiClient> => ({ miJornada: () => Promise.resolve(ok(JORNADA)), listarFacturas: () => Promise.resolve(ok([])), ...extra });

  it('sin jornada elige el camión con un toque y entra a su inicio', async () => {
    const miJornada = vi.fn().mockResolvedValueOnce(ok(null)).mockResolvedValue(ok(JORNADA));
    const iniciarJornada = vi.fn(() => Promise.resolve(ok(JORNADA)));
    montar({ sesion: CHOFER, api: { miJornada, iniciarJornada, listarCamiones: () => Promise.resolve(ok([CAMION])) } });
    await userEvent.click(await screen.findByRole('button', { name: 'Camión 3 · AB·1234' }));
    expect(iniciarJornada).toHaveBeenCalledWith('c1');
    expect(await screen.findByText('Camión Camión 3 · AB·1234')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CARGAR ENTREGAS' })).toHaveAttribute('href', '/cargar');
    expect(screen.getByRole('link', { name: 'MI RUTA' })).toHaveAttribute('href', '/mi-ruta');
  });

  it('con jornada puede cambiar de camión o terminar su día', async () => {
    const terminarJornada = vi.fn(() => Promise.resolve(ok(undefined)));
    montar({ sesion: CHOFER, api: { miJornada: () => Promise.resolve(ok(JORNADA)), terminarJornada, listarCamiones: () => Promise.resolve(ok([CAMION])) } });
    await userEvent.click(await screen.findByRole('button', { name: 'TERMINAR MI DÍA' }));
    expect(terminarJornada).toHaveBeenCalledTimes(1);
  });

  it('cambiar de camión vuelve a la elección', async () => {
    montar({ sesion: CHOFER, api: { miJornada: () => Promise.resolve(ok(JORNADA)), listarCamiones: () => Promise.resolve(ok([CAMION])) } });
    await userEvent.click(await screen.findByRole('button', { name: 'CAMBIAR DE CAMIÓN' }));
    expect(await screen.findByRole('heading', { name: '¿Qué camión manejas hoy?' })).toBeInTheDocument();
  });

  it('carga una entrega con solo el cliente, sin número de factura', async () => {
    const registrarFactura = vi.fn(() => Promise.resolve(ok(FACTURA)));
    const buscarClientes = vi.fn(() => Promise.resolve(ok([RABET])));
    const listarFacturas = vi.fn(() => Promise.resolve(ok([] as never[])));
    montar({ ruta: '/cargar', sesion: CHOFER, api: baseApi({ registrarFactura, buscarClientes, listarFacturas }) });
    await userEvent.type(await screen.findByLabelText('Dirección o cliente'), 'minimarket rabet');
    await userEvent.click(await screen.findByRole('button', { name: /Minimarket Rabet/ }));
    expect(buscarClientes).toHaveBeenLastCalledWith('minimarket rabet', expect.objectContaining({ limite: 6 }));
    expect(registrarFactura).toHaveBeenCalledWith({ localId: 'l1', camionId: 'c1', fecha: '2026-10-05' });
    expect(await screen.findByText('Cargado: Minimarket Rabet.')).toBeInTheDocument();
    expect(screen.getByLabelText('Dirección o cliente')).toHaveValue('');
    expect(listarFacturas).toHaveBeenCalledTimes(2);
  });

  it('si ya cargó a ese cliente hoy, pregunta antes de cargar otra', async () => {
    const registrarFactura = vi.fn(() => Promise.resolve(ok(FACTURA)));
    montar({ ruta: '/cargar', sesion: CHOFER, api: baseApi({ registrarFactura, buscarClientes: () => Promise.resolve(ok([RABET])), listarFacturas: () => Promise.resolve(ok([FACTURA])) }) });
    await screen.findByText('Cargadas hoy (1)');
    await userEvent.type(screen.getByLabelText('Dirección o cliente'), 'rabet');
    await userEvent.click(await screen.findByRole('button', { name: /^Minimarket Rabet.*Maipú/ }));
    expect(await screen.findByText(/Ya cargaste a Minimarket Rabet hoy/)).toBeInTheDocument();
    expect(registrarFactura).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'NO' }));
    expect(screen.queryByText(/Ya cargaste a/)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /^Minimarket Rabet.*Maipú/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'CARGAR OTRA' }));
    await waitFor(() => { expect(registrarFactura).toHaveBeenCalledTimes(1); });
  });

  it('«no lo encuentro»: detecta la comuna del final, crea el cliente solo con dirección y comuna, y lo carga', async () => {
    const crearCliente = vi.fn(() => Promise.resolve(ok({ clienteId: 'k9', localId: 'l9' })));
    const registrarFactura = vi.fn(() => Promise.resolve(ok(FACTURA)));
    const buscarClientes = vi.fn(() => Promise.resolve(ok([])));
    montar({ ruta: '/cargar', sesion: CHOFER, api: baseApi({ crearCliente, registrarFactura, buscarClientes }) });
    await userEvent.type(await screen.findByLabelText('Dirección o cliente'), 'Av. Colón 765 San Bernardo');
    expect(await screen.findByText('No encuentro ese cliente.')).toBeInTheDocument();
    expect(screen.getByText('Comuna:').parentElement).toHaveTextContent('Comuna: San Bernardo');
    expect(buscarClientes).toHaveBeenLastCalledWith('Av. Colón 765', expect.objectContaining({ comuna: 'San Bernardo', limite: 6 }));
    await userEvent.click(screen.getByRole('button', { name: 'NO ESTÁ: BUSCAR Y REGISTRAR' }));
    const form = within(screen.getByRole('form', { name: 'Cliente nuevo' }));
    expect(form.getByLabelText('Dirección')).toHaveValue('Av. Colón 765');
    expect(form.getByLabelText('Comuna')).toHaveValue('San Bernardo');
    await userEvent.click(form.getByRole('button', { name: 'GUARDAR Y CARGAR' }));
    await waitFor(() => { expect(registrarFactura).toHaveBeenCalledWith({ localId: 'l9', camionId: 'c1', fecha: '2026-10-05' }); });
    expect(crearCliente).toHaveBeenCalledWith({ razonSocial: 'Av. Colón 765', direccion: 'Av. Colón 765', comuna: 'San Bernardo' });
    expect(await screen.findByText('Cargado: Av. Colón 765.')).toBeInTheDocument();
  });

  it('«no está»: busca la dirección en el mapa, deja elegir el lugar y lo deja como pin del cliente nuevo', async () => {
    const crearCliente = vi.fn(() => Promise.resolve(ok({ clienteId: 'k9', localId: 'l9' })));
    const fijarPinDesdeEnlace = vi.fn(() => Promise.resolve(ok({ resultado: 'fijado' as const, lat: -33.6012, lng: -70.7021 })));
    const registrarFactura = vi.fn(() => Promise.resolve(ok(FACTURA)));
    const buscarDireccion = vi.fn(() => Promise.resolve(ok([
      { lat: -33.6012, lng: -70.7021, etiqueta: 'Avenida Colón Sur 765, San Bernardo', comuna: 'San Bernardo', precision: 'exacta' as const },
      { lat: -33.6, lng: -70.7, etiqueta: 'Avenida Colón Sur, San Bernardo', comuna: 'San Bernardo', precision: 'calle' as const },
    ])));
    montar({ ruta: '/cargar', sesion: CHOFER, casos: { buscarDireccion }, api: baseApi({ crearCliente, fijarPinDesdeEnlace, registrarFactura, buscarClientes: () => Promise.resolve(ok([])) }) });
    await userEvent.type(await screen.findByLabelText('Dirección o cliente'), 'Av. Colón Sur 765 San Bernardo');
    await userEvent.click(await screen.findByRole('button', { name: 'NO ESTÁ: BUSCAR Y REGISTRAR' }));
    const form = within(screen.getByRole('form', { name: 'Cliente nuevo' }));
    await userEvent.click(form.getByRole('button', { name: 'BUSCAR LA DIRECCIÓN EN EL MAPA' }));
    expect(buscarDireccion).toHaveBeenCalledWith('Av. Colón Sur 765', 'San Bernardo');
    await userEvent.click(await form.findByRole('button', { name: /Avenida Colón Sur 765, San Bernardo/ }));
    expect(form.getByText('Ubicación elegida')).toBeInTheDocument();
    await userEvent.click(form.getByRole('button', { name: 'GUARDAR Y CARGAR' }));
    await waitFor(() => { expect(registrarFactura).toHaveBeenCalled(); });
    expect(crearCliente).toHaveBeenCalledWith({ razonSocial: 'Av. Colón Sur 765', direccion: 'Av. Colón Sur 765', comuna: 'San Bernardo' });
    expect(fijarPinDesdeEnlace).toHaveBeenCalledWith('l9', '-33.6012, -70.7021');
    expect(await screen.findByText('Cargado: Av. Colón Sur 765.')).toBeInTheDocument();
  });

  it('«no está»: si el mapa no la halla ofrece Google Maps; el enlace pegado se manda al servidor y, si no se puede leer, igual se carga con un aviso', async () => {
    const crearCliente = vi.fn(() => Promise.resolve(ok({ clienteId: 'k9', localId: 'l9' })));
    const fijarPinDesdeEnlace = vi.fn(() => Promise.resolve(http(400, { codigo: 'VALIDACION', mensaje: 'No pude leer la ubicación de ese enlace.' })));
    const registrarFactura = vi.fn(() => Promise.resolve(ok(FACTURA)));
    montar({ ruta: '/cargar', sesion: CHOFER, api: baseApi({ crearCliente, fijarPinDesdeEnlace, registrarFactura, buscarClientes: () => Promise.resolve(ok([])) }) });
    await userEvent.type(await screen.findByLabelText('Dirección o cliente'), 'Camino Santa Rita Parcela 4 Pirque');
    await userEvent.click(await screen.findByRole('button', { name: 'NO ESTÁ: BUSCAR Y REGISTRAR' }));
    const form = within(screen.getByRole('form', { name: 'Cliente nuevo' }));
    await userEvent.click(form.getByRole('button', { name: 'BUSCAR LA DIRECCIÓN EN EL MAPA' }));
    expect(await form.findByText(/No encontré esa dirección en el mapa gratuito/)).toBeInTheDocument();
    expect(form.getByRole('link', { name: 'BUSCAR EN GOOGLE MAPS' }).getAttribute('href')).toBe('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Camino Santa Rita Parcela 4, Pirque, Chile'));
    await userEvent.type(form.getByLabelText('Enlace copiado de Google Maps'), 'https://maps.app.goo.gl/AbC123');
    await userEvent.click(form.getByRole('button', { name: 'GUARDAR Y CARGAR' }));
    await waitFor(() => { expect(registrarFactura).toHaveBeenCalled(); });
    expect(fijarPinDesdeEnlace).toHaveBeenCalledWith('l9', 'https://maps.app.goo.gl/AbC123');
    expect(await screen.findByText(/Cargado: Camino Santa Rita Parcela 4\..*No pude leer la ubicación/)).toBeInTheDocument();
  });

  it('sin comuna no se puede guardar el cliente nuevo; con nombre del local lo usa', async () => {
    const crearCliente = vi.fn(() => Promise.resolve(ok({ clienteId: 'k9', localId: 'l9' })));
    montar({ ruta: '/cargar', sesion: CHOFER, api: baseApi({ crearCliente, registrarFactura: () => Promise.resolve(ok(FACTURA)), buscarClientes: () => Promise.resolve(ok([])) }) });
    await userEvent.type(await screen.findByLabelText('Dirección o cliente'), 'Calle 1 123');
    await userEvent.click(await screen.findByRole('button', { name: 'NO ESTÁ: BUSCAR Y REGISTRAR' }));
    const form = within(screen.getByRole('form', { name: 'Cliente nuevo' }));
    await userEvent.click(form.getByRole('button', { name: 'GUARDAR Y CARGAR' }));
    expect(await form.findByRole('alert')).toHaveTextContent('Falta la dirección o la comuna.');
    expect(crearCliente).not.toHaveBeenCalled();
    await userEvent.selectOptions(form.getByLabelText('Comuna'), 'Maipú');
    await userEvent.type(form.getByLabelText('Nombre del local (opcional)'), 'Almacén Don Pepe');
    await userEvent.click(form.getByRole('button', { name: 'GUARDAR Y CARGAR' }));
    await waitFor(() => { expect(crearCliente).toHaveBeenCalledWith({ razonSocial: 'Almacén Don Pepe', direccion: 'Calle 1 123', comuna: 'Maipú' }); });
  });

  it('el RUT opcional se completa solo con números y se manda con el dígito verificador; uno inválido no se envía', async () => {
    const crearCliente = vi.fn(() => Promise.resolve(ok({ clienteId: 'k9', localId: 'l9' })));
    montar({ ruta: '/cargar', sesion: CHOFER, api: baseApi({ crearCliente, registrarFactura: () => Promise.resolve(ok(FACTURA)), buscarClientes: () => Promise.resolve(ok([])) }) });
    await userEvent.type(await screen.findByLabelText('Dirección o cliente'), 'Av. Colón Sur 765 San Bernardo');
    await userEvent.click(await screen.findByRole('button', { name: 'NO ESTÁ: BUSCAR Y REGISTRAR' }));
    const form = within(screen.getByRole('form', { name: 'Cliente nuevo' }));
    await userEvent.type(form.getByLabelText('RUT (opcional)'), '77975918');
    expect(await form.findByText('RUT 77.975.918-0')).toBeInTheDocument();
    await userEvent.click(form.getByRole('button', { name: 'GUARDAR Y CARGAR' }));
    await waitFor(() => { expect(crearCliente).toHaveBeenCalledWith({ razonSocial: 'Av. Colón Sur 765', direccion: 'Av. Colón Sur 765', comuna: 'San Bernardo', rut: '77975918-0' }); });
  });

  it('un RUT con dígito verificador equivocado se avisa y no se envía', async () => {
    const crearCliente = vi.fn();
    montar({ ruta: '/cargar', sesion: CHOFER, api: baseApi({ crearCliente, buscarClientes: () => Promise.resolve(ok([])) }) });
    await userEvent.type(await screen.findByLabelText('Dirección o cliente'), 'Calle 1 123 Maipú');
    await userEvent.click(await screen.findByRole('button', { name: 'NO ESTÁ: BUSCAR Y REGISTRAR' }));
    const form = within(screen.getByRole('form', { name: 'Cliente nuevo' }));
    await userEvent.type(form.getByLabelText('RUT (opcional)'), '77.975.918-1');
    await userEvent.click(form.getByRole('button', { name: 'GUARDAR Y CARGAR' }));
    expect(await form.findByRole('alert')).toHaveTextContent('El RUT no es válido');
    expect(crearCliente).not.toHaveBeenCalled();
  });

  it('un error al crear el cliente se muestra en lenguaje simple', async () => {
    const crearCliente = vi.fn(() => Promise.resolve(http(422, { codigo: 'VALIDACION', mensaje: 'Hay datos inválidos.', detalle: { errores: [{ mensaje: 'La comuna no es de la Región Metropolitana.' }] } })));
    montar({ ruta: '/cargar', sesion: CHOFER, api: baseApi({ crearCliente, buscarClientes: () => Promise.resolve(ok([])) }) });
    await userEvent.type(await screen.findByLabelText('Dirección o cliente'), 'kiosko sol');
    await userEvent.click(await screen.findByRole('button', { name: 'NO ESTÁ: BUSCAR Y REGISTRAR' }));
    const form = within(screen.getByRole('form', { name: 'Cliente nuevo' }));
    await userEvent.selectOptions(form.getByLabelText('Comuna'), 'Maipú');
    await userEvent.click(form.getByRole('button', { name: 'GUARDAR Y CARGAR' }));
    expect(await form.findByRole('alert')).toHaveTextContent('La comuna no es de la Región Metropolitana.');
  });

  it('lista lo cargado hoy con condiciones; se pueden poner «antes de», urgente y nota, o quitar', async () => {
    const actualizarFactura = vi.fn(() => Promise.resolve(ok({ ...FACTURA, urgente: true })));
    montar({ ruta: '/cargar', sesion: CHOFER, api: baseApi({ listarFacturas: () => Promise.resolve(ok([FACTURA])), actualizarFactura }) });
    expect(await screen.findByText('Cargadas hoy (1)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CALCULAR MI RUTA' })).toHaveAttribute('href', '/mi-ruta');
    await userEvent.click(screen.getByRole('button', { name: 'CONDICIONES Minimarket Rabet' }));
    await userEvent.type(screen.getByLabelText('Entregar antes de (Minimarket Rabet)'), '13:00');
    await userEvent.click(screen.getByLabelText('Urgente'));
    await userEvent.type(screen.getByLabelText('Nota (Minimarket Rabet)'), 'portón verde');
    await userEvent.click(screen.getByRole('button', { name: 'GUARDAR CONDICIONES' }));
    expect(actualizarFactura).toHaveBeenCalledWith('f1', { antesDeMin: 780, urgente: true, nota: 'portón verde' });
    await userEvent.click(screen.getByRole('button', { name: 'QUITAR Minimarket Rabet' }));
    expect(actualizarFactura).toHaveBeenLastCalledWith('f1', { estado: 'anulada' });
  });

  it('el botón HABLAR dicta en el campo del cliente; tocar de nuevo mientras escucha lo detiene', async () => {
    let manejadores: Parameters<Casos['voz']['escuchar']>[0] | undefined;
    const detener = vi.fn();
    const voz = { disponible: true, escuchar: vi.fn((m: Parameters<Casos['voz']['escuchar']>[0]) => { manejadores = m; return { detener }; }) };
    montar({ ruta: '/cargar', sesion: CHOFER, casos: { voz }, api: baseApi({ buscarClientes: () => Promise.resolve(ok([RABET])) }) });
    await userEvent.click(await screen.findByRole('button', { name: 'HABLAR' }));
    act(() => { manejadores?.alTexto({ texto: 'minimarket rabet', final: true }); });
    expect(screen.getByLabelText('Dirección o cliente')).toHaveValue('minimarket rabet');
    await userEvent.click(await screen.findByRole('button', { name: 'ESCUCHANDO… TOCA PARA PARAR' }));
    expect(detener).toHaveBeenCalledTimes(1);
    act(() => { manejadores?.alTerminar('PERMISO'); });
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay permiso para usar el micrófono');
  });

  it('sin dictado propio no muestra HABLAR y sugiere el micrófono del teclado', async () => {
    montar({ ruta: '/cargar', sesion: CHOFER, api: baseApi() });
    expect(await screen.findByText(/usa el micrófono del teclado/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'HABLAR' })).toBeNull();
  });

  it('sin jornada, cargar y ruta mandan a elegir el camión', async () => {
    montar({ ruta: '/cargar', sesion: CHOFER });
    expect(await screen.findByText(/Primero elige el camión que manejas hoy/)).toBeInTheDocument();
  });

  it('mi ruta muestra la ruta de su camión de hoy', async () => {
    const verRuta = vi.fn(() => Promise.resolve(ok({ camionId: 'c1', fecha: '2026-10-05', planificada: false, salidaMin: 480, horaLimiteRegresoMin: 1260, paradas: [], nuevas: [], hechas: [], sinPin: [], noAtendidas: [], enRiesgo: [] })));
    montar({ ruta: '/mi-ruta', sesion: CHOFER, api: { miJornada: () => Promise.resolve(ok(JORNADA)), verRuta } });
    expect(await screen.findByText(/Esta ruta aún no está calculada/)).toBeInTheDocument();
    expect(screen.getByText(/Todavía no cargaste las facturas de hoy/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CARGAR FACTURAS' })).toHaveAttribute('href', '/cargar');
    expect(screen.getByRole('button', { name: 'CALCULAR RUTA SUGERIDA' })).toBeDisabled();
    expect(verRuta).toHaveBeenCalledWith('c1', '2026-10-05');
  });

  it('el despachador no entra a /cargar ni /mi-ruta', async () => {
    montar({ ruta: '/cargar', sesion: DESPACHADOR });
    expect(await screen.findByRole('heading', { name: 'Hola, Ana' })).toBeInTheDocument();
  });
});

describe('acciones en la parada (chofer)', () => {
  const JORNADA = { id: 'j1', fecha: '2026-10-05', desde: '2026-10-05T11:00:00.000Z', camion: { id: 'c1', patente: 'AB1234', alias: 'Camión 3' } };
  const paradaDe = (n: string, pos: number, extra: object = {}) => ({ facturaId: `f${n}`, localId: `l${n}`, cliente: `Local ${n}`, direccion: `Calle ${n} 100`, comuna: 'San Bernardo', lat: -33.59, lng: -70.7, urgente: false, posicion: pos, llegada: 600 + pos * 20, inicioServicio: 600 + pos * 20, salida: 608 + pos * 20, espera: 0, atraso: 0, motivos: ['MENOR_DESVIO' as const], fijada: false, ...extra });
  const vistaBase = (extra: object = {}) => ({ camionId: 'c1', fecha: '2026-10-05', planificada: true, modo: 'sugerida' as const, version: 1, salidaMin: 480, horaLimiteRegresoMin: 1260, regreso: 800, regresoTardio: false, paradas: [paradaDe('A', 0), paradaDe('B', 1)], nuevas: [], hechas: [], sinPin: [], noAtendidas: [], enRiesgo: [], ...extra });
  const abrir = (api: Partial<ApiClient> = {}, casos: Partial<Casos> = {}, sesion = CHOFER) =>
    montar({ ruta: '/mi-ruta', sesion, casos, api: { miJornada: () => Promise.resolve(ok(JORNADA)), verRuta: () => Promise.resolve(ok(vistaBase())), ...api } });
  const gps = (precisionM = 10) => ({ disponible: true, actual: vi.fn(() => Promise.resolve(ok({ lat: -33.5901, lng: -70.7002, precisionM }))) });

  it('el chofer no arma su ruta: con facturas cargadas y sin ordenar, el sistema la calcula solo', async () => {
    const nueva = { facturaId: 'fN', localId: 'lN', cliente: 'Local N', direccion: 'Calle N 1', comuna: 'San Bernardo', urgente: false };
    const planificarRuta = vi.fn(() => Promise.resolve(ok(vistaBase())));
    const verRuta = vi.fn(() => Promise.resolve(ok(vistaBase({ planificada: false, paradas: [], nuevas: [nueva] }))));
    abrir({ verRuta, planificarRuta });
    expect(await screen.findByRole('button', { name: 'ENTREGADO Local A' })).toBeInTheDocument();
    expect(planificarRuta).toHaveBeenCalledTimes(1);
    expect(planificarRuta).toHaveBeenCalledWith('c1', '2026-10-05');
  });

  it('el despachador no calcula solo: ve el aviso y decide', async () => {
    const planificarRuta = vi.fn(() => Promise.resolve(ok(vistaBase())));
    const nueva = { facturaId: 'fN', localId: 'lN', cliente: 'Local N', direccion: 'Calle N 1', comuna: 'San Bernardo', urgente: false };
    montar({ ruta: '/rutas', sesion: DESPACHADOR, api: { listarCamiones: () => Promise.resolve(ok([{ id: 'c1', patente: 'AB1234', activo: true }])), verRuta: () => Promise.resolve(ok(vistaBase({ planificada: false, paradas: [], nuevas: [nueva] }))), planificarRuta } });
    await screen.findByRole('option', { name: 'AB·1234' });
    await userEvent.selectOptions(screen.getByLabelText('Camión'), 'c1');
    expect(await screen.findByText(/Hay 1 facturas por ordenar/)).toBeInTheDocument();
    expect(planificarRuta).not.toHaveBeenCalled();
  });

  it('cada parada ofrece navegar con Waze y Google Maps usando el pin, o la dirección escrita si no hay pin', async () => {
    abrir({ verRuta: () => Promise.resolve(ok(vistaBase({ paradas: [paradaDe('A', 0), paradaDe('B', 1, { lat: undefined, lng: undefined })] }))) });
    expect(await screen.findByRole('link', { name: 'NAVEGAR CON WAZE a Local A' })).toHaveAttribute('href', 'https://waze.com/ul?ll=-33.59,-70.7&navigate=yes');
    expect(screen.getByRole('link', { name: 'NAVEGAR CON GOOGLE MAPS a Local A' })).toHaveAttribute('href', expect.stringContaining('destination=-33.59,-70.7'));
    await userEvent.click(within(screen.getByRole('listitem', { name: 'Parada 2' })).getByRole('button', { expanded: false }));
    expect(screen.getByRole('link', { name: 'NAVEGAR CON WAZE a Local B' })).toHaveAttribute('href', expect.stringContaining('waze.com/ul?q=Calle%20B%20100%2C%20San%20Bernardo'));
    expect(screen.getByRole('link', { name: 'LAS PRÓXIMAS 2 EN GOOGLE MAPS' })).toHaveAttribute('href', expect.stringContaining('waypoints='));
  });

  it('ya no hay botón ESTOY AQUÍ: la posición se guarda sola al entregar o al encontrar cerrado', async () => {
    abrir({}, { ubicacion: gps() });
    await screen.findByRole('button', { name: 'ENTREGADO Local A' });
    expect(screen.queryByRole('button', { name: /ESTOY AQUÍ/ })).toBeNull();
  });

  it('si el GPS falla igual se anota el aviso, sin ubicación, y se avisa', async () => {
    const registrarEvento = vi.fn(() => Promise.resolve(ok({ estado: 'pendiente' as const, pinFijado: false })));
    const ubicacion = { disponible: true, actual: vi.fn(() => Promise.resolve(err('PERMISO' as const))) };
    abrir({ registrarEvento }, { ubicacion });
    await userEvent.click(await screen.findByRole('button', { name: 'ESTÁ CERRADO Local A' }));
    expect(registrarEvento).toHaveBeenCalledWith('fA', { tipo: 'cerrado' });
    expect(await screen.findByText(/No pude leer el GPS; quedó sin ubicación/)).toBeInTheDocument();
  });

  it('UBICACIÓN DEL VENDEDOR: pega el enlace y la API fija el pin del local', async () => {
    const fijarPinDesdeEnlace = vi.fn(() => Promise.resolve(ok({ resultado: 'fijado' as const, lat: -33.5972, lng: -70.7019 })));
    abrir({ fijarPinDesdeEnlace });
    await userEvent.click(await screen.findByRole('button', { name: 'UBICACIÓN DEL VENDEDOR Local A' }));
    const panel = within(await screen.findByLabelText('Ubicación del vendedor: Local A'));
    await userEvent.type(panel.getByLabelText('Enlace de la ubicación'), 'https://maps.app.goo.gl/AbC123');
    await userEvent.click(panel.getByRole('button', { name: 'GUARDAR UBICACIÓN DEL VENDEDOR' }));
    expect(fijarPinDesdeEnlace).toHaveBeenCalledWith('lA', 'https://maps.app.goo.gl/AbC123');
    expect(await panel.findByText(/Ubicación guardada. Desde ahora sirve para todos/)).toBeInTheDocument();
  });

  it('UBICACIÓN DEL VENDEDOR: si el local ya tiene un pin confirmado por una persona, avisa que quedó propuesta; un enlace ilegible muestra el error', async () => {
    const fijarPinDesdeEnlace = vi.fn()
      .mockResolvedValueOnce(ok({ resultado: 'propuesto' as const, lat: -33.5972, lng: -70.7019 }))
      .mockResolvedValueOnce(http(400, { codigo: 'VALIDACION', mensaje: 'No pude leer la ubicación de ese enlace.' }));
    abrir({ fijarPinDesdeEnlace });
    await userEvent.click(await screen.findByRole('button', { name: 'UBICACIÓN DEL VENDEDOR Local A' }));
    const panel = within(await screen.findByLabelText('Ubicación del vendedor: Local A'));
    await userEvent.type(panel.getByLabelText('Enlace de la ubicación'), 'https://maps.google.com/?q=-33.5972,-70.7019');
    await userEvent.click(panel.getByRole('button', { name: 'GUARDAR UBICACIÓN DEL VENDEDOR' }));
    expect(await panel.findByText(/quedó propuesta para que la revisen/)).toBeInTheDocument();
    await userEvent.type(panel.getByLabelText('Enlace de la ubicación'), 'hola');
    await userEvent.click(panel.getByRole('button', { name: 'GUARDAR UBICACIÓN DEL VENDEDOR' }));
    expect(await panel.findByRole('alert')).toHaveTextContent('No pude leer la ubicación');
  });

  it('ENTREGADO avisa con la posición y vuelve a pedir la ruta (la parada sale de la lista)', async () => {
    const registrarEvento = vi.fn(() => Promise.resolve(ok({ estado: 'entregada' as const, pinFijado: false })));
    const verRuta = vi.fn()
      .mockResolvedValueOnce(ok(vistaBase()))
      .mockResolvedValueOnce(ok(vistaBase({ paradas: [paradaDe('B', 0)], hechas: [{ facturaId: 'fA', localId: 'lA', cliente: 'Local A', direccion: 'Calle A 100', comuna: 'San Bernardo', urgente: false, estado: 'entregada' }] })));
    abrir({ registrarEvento, verRuta }, { ubicacion: gps() });
    await userEvent.click(await screen.findByRole('button', { name: 'ENTREGADO Local A' }));
    expect(registrarEvento).toHaveBeenCalledWith('fA', expect.objectContaining({ tipo: 'entregado', lat: -33.5901 }));
    const hechas = await screen.findByRole('region', { name: 'Hechas hoy' });
    expect(within(hechas).getByText('ENTREGADA')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ENTREGADO Local A' })).toBeNull();
    expect(verRuta).toHaveBeenCalledTimes(2);
  });

  it('una entrega hecha se puede deshacer (vuelve a pendiente)', async () => {
    const actualizarFactura = vi.fn(() => Promise.resolve(ok({ id: 'fA', fecha: '2026-10-05', estado: 'pendiente' as const, urgente: false, local: { id: 'lA', razonSocial: 'Local A', direccion: 'Calle A 100', comuna: 'San Bernardo', tienePin: true } })));
    abrir({ actualizarFactura, verRuta: () => Promise.resolve(ok(vistaBase({ paradas: [], hechas: [{ facturaId: 'fA', localId: 'lA', cliente: 'Local A', direccion: 'Calle A 100', comuna: 'San Bernardo', urgente: false, estado: 'no_entregada' }] }))) });
    const fila = await screen.findByRole('button', { name: /Local A/ });
    expect(within(fila).getByText('NO ENTREGADA')).toBeInTheDocument();
    expect(within(fila).getByText('Local A')).toHaveClass('tachado');
    await userEvent.click(fila);
    await userEvent.click(screen.getByRole('button', { name: 'DESHACER Local A' }));
    expect(actualizarFactura).toHaveBeenCalledWith('fA', { estado: 'pendiente' });
  });

  it('ESTÁ CERRADO anota el aviso y ofrece WhatsApp al vendedor con el mensaje armado, esperar o seguir', async () => {
    const registrarEvento = vi.fn(() => Promise.resolve(ok({ estado: 'pendiente' as const, pinFijado: false })));
    abrir({ registrarEvento }, { ubicacion: gps() });
    await userEvent.click(await screen.findByRole('button', { name: 'ESTÁ CERRADO Local A' }));
    expect(registrarEvento).toHaveBeenCalledWith('fA', expect.objectContaining({ tipo: 'cerrado' }));
    const panel = within(await screen.findByLabelText('Local cerrado: Local A'));
    const wa = panel.getByRole('link', { name: 'AVISAR AL VENDEDOR POR WHATSAPP' });
    expect(decodeURIComponent(wa.getAttribute('href') ?? '')).toContain('Hola, estoy en Calle A 100, San Bernardo y está cerrado (12:00)');
    await userEvent.type(panel.getByLabelText('Nombre que sale en la guía'), 'Rabelo Mágica SpA');
    expect(decodeURIComponent(panel.getByRole('link', { name: 'AVISAR AL VENDEDOR POR WHATSAPP' }).getAttribute('href') ?? '')).toContain('Calle A 100, San Bernardo (Rabelo Mágica SpA) y está cerrado (12:00)');
    expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\?text=/);
    await userEvent.click(panel.getByRole('button', { name: 'ESPERAR 15 MIN' }));
    expect(registrarEvento).toHaveBeenLastCalledWith('fA', { tipo: 'espera', minutos: 15 });
    expect(await screen.findByText(/Esperando 15 minutos \(hasta las 12:15\)/)).toBeInTheDocument();
  });

  it('ESTÁ CERRADO con vendedores cargados: un botón de WhatsApp por cada uno con celular, al chat de ese vendedor', async () => {
    const listarVendedores = () => Promise.resolve(ok([
      { id: 'v1', codigo: 'V01', nombre: 'Ana', celular: '56912345678', activo: true },
      { id: 'v2', codigo: 'V02', nombre: 'Luis', activo: true },
    ]));
    abrir({ listarVendedores, registrarEvento: () => Promise.resolve(ok({ estado: 'pendiente' as const, pinFijado: false })) }, { ubicacion: gps() });
    await userEvent.click(await screen.findByRole('button', { name: 'ESTÁ CERRADO Local A' }));
    const panel = within(await screen.findByLabelText('Local cerrado: Local A'));
    const ana = await panel.findByRole('link', { name: 'AVISAR A V01 ANA POR WHATSAPP' });
    expect(ana.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/56912345678\?text=/);
    expect(panel.queryByText(/V02/)).toBeNull();
    expect(panel.getByRole('link', { name: 'AVISAR A OTRO CONTACTO' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });

  it('cerrado → SEGUIR Y VOLVER MÁS TARDE reordena la ruta (la deja para después)', async () => {
    const registrarEvento = vi.fn(() => Promise.resolve(ok({ estado: 'pendiente' as const, pinFijado: false })));
    const operarRuta = vi.fn(() => Promise.resolve(ok(vistaBase({ version: 2 }))));
    abrir({ registrarEvento, operarRuta });
    await userEvent.click(await screen.findByRole('button', { name: 'ESTÁ CERRADO Local A' }));
    await userEvent.click(await screen.findByRole('button', { name: 'SEGUIR Y VOLVER MÁS TARDE' }));
    expect(registrarEvento).toHaveBeenLastCalledWith('fA', { tipo: 'vuelve_mas_tarde' });
    await waitFor(() => { expect(operarRuta).toHaveBeenCalledWith('c1', '2026-10-05', 1, { tipo: 'despues', facturaId: 'fA' }); });
  });

  it('cerrado → DEJAR PARA OTRO DÍA la marca como no entregada por estar cerrado', async () => {
    const registrarEvento = vi.fn(() => Promise.resolve(ok({ estado: 'no_entregada' as const, pinFijado: false })));
    abrir({ registrarEvento });
    await userEvent.click(await screen.findByRole('button', { name: 'ESTÁ CERRADO Local A' }));
    await userEvent.click(await screen.findByRole('button', { name: 'SEGUIR: DEJAR PARA OTRO DÍA' }));
    expect(registrarEvento).toHaveBeenLastCalledWith('fA', { tipo: 'no_entregado', motivo: 'cerrado' });
  });

  it('NO LA ENCUENTRO ofrece enviar la dirección por WhatsApp o marcarla como no entregada', async () => {
    const registrarEvento = vi.fn(() => Promise.resolve(ok({ estado: 'no_entregada' as const, pinFijado: false })));
    abrir({ registrarEvento });
    await userEvent.click(await screen.findByRole('button', { name: 'NO LA ENCUENTRO Local A' }));
    const panel = within(screen.getByLabelText('No encuentra la dirección: Local A'));
    expect(decodeURIComponent(panel.getByRole('link', { name: 'ENVIAR LA DIRECCIÓN POR WHATSAPP' }).getAttribute('href') ?? '')).toContain('no encuentro la dirección Calle A 100, San Bernardo (Local A)');
    await userEvent.click(panel.getByRole('button', { name: 'NO SE PUDO ENTREGAR (DIRECCIÓN)' }));
    expect(registrarEvento).toHaveBeenLastCalledWith('fA', { tipo: 'no_entregado', motivo: 'direccion' });
  });

  it('un error de la API al avisar se muestra y no cambia la lista', async () => {
    const registrarEvento = vi.fn(() => Promise.resolve(http(403, { codigo: 'SIN_PERMISO', mensaje: 'Esa entrega no es de tu camión de hoy.' })));
    abrir({ registrarEvento });
    await userEvent.click(await screen.findByRole('button', { name: 'ENTREGADO Local A' }));
    expect(await screen.findByText('No tienes permiso para hacer esto.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ENTREGADO Local A' })).toBeInTheDocument();
  });

  it('el ayudante también ve las acciones; el despachador no (solo mira y acomoda)', async () => {
    abrir({}, {}, { id: 'u9', username: 'ayud', nombre: 'Max García', rol: 'ayudante' });
    expect(await screen.findByRole('button', { name: 'ENTREGADO Local A' })).toBeInTheDocument();
  });

  it('las horas «desde ahora» se avisan en la ruta de hoy', async () => {
    abrir({ verRuta: () => Promise.resolve(ok(vistaBase({ calculadaDesdeMin: 630 }))) });
    expect(await screen.findByText(/Las horas se calculan desde las 10:30 \(ahora\)/)).toBeInTheDocument();
  });
});

describe('ayudante', () => {
  it('ve el mismo inicio que el chofer: elegir camión, cargar y ruta', async () => {
    montar({ sesion: { id: 'u9', username: 'ayud', nombre: 'Max García', rol: 'ayudante' } });
    expect(await screen.findByRole('heading', { name: '¿Qué camión manejas hoy?' })).toBeInTheDocument();
  });
});
