import { describe, expect, it } from 'vitest';
import { mensajeDeError, mensajesDeDetalle } from './mensajes';

describe('mensajeDeError', () => {
  it('traduce red, tiempo y permisos a lenguaje simple', () => {
    expect(mensajeDeError({ kind: 'NETWORK' })).toContain('Sin conexión');
    expect(mensajeDeError({ kind: 'TIMEOUT' })).toContain('tarda');
    expect(mensajeDeError({ kind: 'HTTP', status: 403, codigo: 'SIN_PERMISO' })).toBe('No tienes permiso para hacer esto.');
    expect(mensajeDeError({ kind: 'HTTP', status: 502 })).toContain('servicio externo');
  });

  it('usa el mensaje de negocio de la API o el texto por defecto', () => {
    expect(mensajeDeError({ kind: 'HTTP', status: 409, mensaje: 'Ya existe ese cliente con esa dirección.' })).toBe('Ya existe ese cliente con esa dirección.');
    expect(mensajeDeError({ kind: 'HTTP', status: 500 }, 'Falló')).toBe('Falló');
    expect(mensajeDeError({ kind: 'UNEXPECTED' }, 'Falló')).toBe('Falló');
  });
});

describe('mensajesDeDetalle', () => {
  it('extrae los mensajes de detalle.errores y tolera cualquier otra forma', () => {
    const e = { kind: 'HTTP' as const, detalle: { errores: [{ codigo: 'A', mensaje: 'Falta la razón social.' }, { codigo: 'B' }, 'x', { mensaje: 'Comuna inválida.' }] } };
    expect(mensajesDeDetalle(e)).toEqual(['Falta la razón social.', 'Comuna inválida.']);
    expect(mensajesDeDetalle({ kind: 'HTTP' })).toEqual([]);
    expect(mensajesDeDetalle({ kind: 'HTTP', detalle: 'texto' })).toEqual([]);
    expect(mensajesDeDetalle({ kind: 'HTTP', detalle: { errores: 'no es lista' } })).toEqual([]);
  });
});
