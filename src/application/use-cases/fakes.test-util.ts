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
  registrarFoto: sinImplementar, urlFoto: sinImplementar, importarPines: sinImplementar, listarPropuestas: sinImplementar,
  resolverPropuesta: sinImplementar, listarUsuarios: sinImplementar, crearUsuario: sinImplementar, resetearPin: sinImplementar,
  cambiarEstadoUsuario: sinImplementar, listarCamiones: sinImplementar, crearCamion: sinImplementar, actualizarCamion: sinImplementar,
  listarFacturas: sinImplementar, registrarFactura: sinImplementar, actualizarFactura: sinImplementar, ...extra,
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

export const USUARIO: UsuarioSesion = { id: 'u1', username: 'jperez', nombre: 'Juan Pérez', rol: 'chofer' };
export const TOKENS: Tokens = { accessToken: 'at', refreshToken: 'rt' };
export const http = (status: number, extra: Partial<ApiError> = {}): { ok: false; error: ApiError } => err({ kind: 'HTTP', status, ...extra });
export { ok, err };
