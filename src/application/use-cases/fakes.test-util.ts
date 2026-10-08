import { vi } from 'vitest';
import { err, ok } from '../../domain/result';
import type { Tokens, UsuarioSesion } from '../modelos';
import type { ApiClient, ApiError } from '../ports/api-client';
import type { SesionStore } from '../ports/sesion-store';

export const sinImplementar = (): never => {
  throw new Error('no esperado en este test');
};

export const fakeApi = (extra: Partial<ApiClient> = {}): ApiClient => ({
  getHealth: sinImplementar, iniciarSesion: sinImplementar, yo: sinImplementar, buscarClientes: sinImplementar, crearCliente: sinImplementar,
  importarClientes: sinImplementar, obtenerLocal: sinImplementar, actualizarLocal: sinImplementar, solicitarUrlSubida: sinImplementar,
  registrarFoto: sinImplementar, urlFoto: sinImplementar, listarPropuestas: sinImplementar,
  resolverPropuesta: sinImplementar, pinesParaRevisar: sinImplementar, listarUsuarios: sinImplementar, crearUsuario: sinImplementar, resetearPin: sinImplementar,
  cambiarEstadoUsuario: sinImplementar, cambiarEditorUsuario: sinImplementar, corregirCliente: sinImplementar, resumenComunas: sinImplementar, listarLocales: sinImplementar, eliminarLocal: sinImplementar, listarCamiones: () => Promise.resolve(ok([])), crearCamion: sinImplementar, actualizarCamion: sinImplementar,
  fijarPinDesdeEnlace: sinImplementar, buscarPinesPendientes: sinImplementar, exportarLocales: sinImplementar, quitarFoto: sinImplementar, verificarPin: sinImplementar, reportarFoto: sinImplementar, fotosParaRevision: sinImplementar, verificarFoto: sinImplementar, resolverReporteFoto: sinImplementar, reportarLocal: sinImplementar, verReportes: sinImplementar, resolverReporteLocal: sinImplementar, estadoBusquedaPines: () => Promise.resolve(ok({ sinPin: 0, enCola: 0, enMarcha: false })), listarVendedores: () => Promise.resolve(ok([])), crearVendedor: sinImplementar, actualizarVendedor: sinImplementar,
  listarFacturas: sinImplementar, registrarFactura: sinImplementar, actualizarFactura: sinImplementar,
  registrarEvento: sinImplementar, enviarPosiciones: sinImplementar, analitica: sinImplementar, ejecutarAnalisis: sinImplementar, obtenerHorario: () => Promise.resolve(ok([])), guardarHorario: sinImplementar, miJornada: () => Promise.resolve(ok(null)), iniciarJornada: sinImplementar, terminarJornada: sinImplementar, terminarRuta: sinImplementar, obtenerConfig: sinImplementar, guardarConfig: sinImplementar, verRuta: sinImplementar, planificarRuta: sinImplementar, operarRuta: sinImplementar, ...extra,
});

export const fakeStore = (inicial?: Tokens) => {
  let tokens = inicial;
  const store: SesionStore = {
    cargar: () => tokens,
    guardar: vi.fn((t: Tokens) => { tokens = t; }),
    borrar: vi.fn(() => { tokens = undefined; }),
  };
  return store;
};

export const USUARIO: UsuarioSesion = { id: 'u1', username: 'jperez', nombre: 'Juan Pérez', rol: 'chofer', editor: false };
export const TOKENS: Tokens = { accessToken: 'at', refreshToken: 'rt' };
export const http = (status: number, extra: Partial<ApiError> = {}): { ok: false; error: ApiError } => err({ kind: 'HTTP', status, ...extra });
export { ok, err };
