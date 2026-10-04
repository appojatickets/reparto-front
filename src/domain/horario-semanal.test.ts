import { describe, expect, it } from 'vitest';
import { abreA, aDiasApi, cierraA, conColacion, desdeApi, DIAS, LUN_A_VIE, marcarCerrado, marcarSinDato, personalizado, resumenDia, semanaVacia, validarSemana } from './horario-semanal';

const h = (hh: number, mm = 0): number => hh * 60 + mm;

describe('horario semanal: opciones rápidas', () => {
  it('«cerrado» y «sin dato» se aplican a los días elegidos y no tocan los demás', () => {
    const a = marcarCerrado(semanaVacia(), [0, 6]);
    expect(a.semana[0]).toEqual({ estado: 'cerrado' });
    expect(a.semana[1]).toEqual({ estado: 'sin-dato' });
    const b = marcarSinDato(a.semana, [0]);
    expect(b.semana[0]).toEqual({ estado: 'sin-dato' });
    expect(b.semana[6]).toEqual({ estado: 'cerrado' });
  });

  it('«abre a las 10» sin dato previo abre a las 10 y no tiene hora de cierre', () => {
    const r = abreA(semanaVacia(), LUN_A_VIE, h(10));
    expect(r.semana[1]).toEqual({ estado: 'abierto', tramos: [{ desde: 600, hasta: 1439 }] });
    expect(resumenDia(r.semana[1])).toBe('Abre a las 10:00');
  });

  it('«abre a las X» después de «cierra a las Y» da el rango completo', () => {
    const r = abreA(cierraA(semanaVacia(), [1], h(18)).semana, [1], h(10));
    expect(r.semana[1]).toEqual({ estado: 'abierto', tramos: [{ desde: 600, hasta: 1080 }] });
    expect(resumenDia(r.semana[1])).toBe('Abre 10:00 · cierra 18:00');
  });

  it('«cierra a las 14» sin dato previo atiende desde el comienzo del día', () => {
    const r = cierraA(semanaVacia(), [6], h(14));
    expect(resumenDia(r.semana[6])).toBe('Cierra a las 14:00');
  });

  it('cambiar la apertura mantiene la colación; abrir después del primer tramo reemplaza el horario', () => {
    const base = personalizado(semanaVacia(), [1], { abre: h(9), cierra: h(18), colacion: { desde: h(13), hasta: h(14) } }).semana;
    expect(abreA(base, [1], h(10)).semana[1]).toEqual({ estado: 'abierto', tramos: [{ desde: 600, hasta: 780 }, { desde: 840, hasta: 1080 }] });
    expect(abreA(base, [1], h(15)).semana[1]).toEqual({ estado: 'abierto', tramos: [{ desde: 900, hasta: 1080 }] });
  });

  it('cerrar antes de la última apertura ajusta el horario en vez de dejarlo roto', () => {
    const base = personalizado(semanaVacia(), [1], { abre: h(9), cierra: h(18), colacion: { desde: h(13), hasta: h(14) } }).semana;
    const r = cierraA(base, [1], h(12));
    expect(r.semana[1]).toEqual({ estado: 'abierto', tramos: [{ desde: 540, hasta: 720 }] });
  });

  it('la colación parte el horario en dos y se puede quitar', () => {
    const base = personalizado(semanaVacia(), [1, 2], { abre: h(9), cierra: h(18) }).semana;
    const c = conColacion(base, [1, 2], { desde: h(13), hasta: h(14) });
    expect(c.semana[1]).toEqual({ estado: 'abierto', tramos: [{ desde: 540, hasta: 780 }, { desde: 840, hasta: 1080 }] });
    expect(resumenDia(c.semana[1])).toBe('09:00 a 13:00 y 14:00 a 18:00');
    const sin = conColacion(c.semana, [1], undefined);
    expect(sin.semana[1]).toEqual({ estado: 'abierto', tramos: [{ desde: 540, hasta: 1080 }] });
    expect(sin.semana[2]).toEqual(c.semana[2]);
  });

  it('una colación sin horario previo usa todo el día; una que cae fuera del horario se omite y se informa', () => {
    expect(conColacion(semanaVacia(), [1], { desde: h(13), hasta: h(14) }).semana[1]).toMatchObject({ estado: 'abierto' });
    const base = abreA(semanaVacia(), [1, 2], h(14)).semana;
    const r = conColacion(base, [1, 2], { desde: h(13), hasta: h(14) });
    expect(r.omitidos).toEqual([1, 2]);
    expect(r.semana[1]).toEqual(base[1]);
  });

  it('«personalizado» valida que abra antes de cerrar y que la colación quede dentro', () => {
    expect(personalizado(semanaVacia(), [1], { abre: h(18), cierra: h(9) }).omitidos).toEqual([1]);
    expect(personalizado(semanaVacia(), [1], { abre: h(9), cierra: h(18), colacion: { desde: h(8), hasta: h(10) } }).omitidos).toEqual([1]);
    expect(personalizado(semanaVacia(), [1], { abre: h(9), cierra: h(18) }).omitidos).toEqual([]);
  });
});

describe('horario semanal: ida y vuelta con la API', () => {
  it('envía solo los días con dato, en orden de lunes a domingo', () => {
    let s = semanaVacia();
    s = marcarCerrado(s, [0]).semana;
    s = personalizado(s, [1, 2], { abre: h(10), cierra: h(18), colacion: { desde: h(13), hasta: h(14) } }).semana;
    const api = aDiasApi(s);
    expect(api.map((d) => d.dia)).toEqual([1, 2, 0]);
    expect(api[2]).toEqual({ dia: 0, cerrado: true, tramos: [] });
    expect(DIAS.map((d) => d.dia)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it('reconstruye la semana desde la API', () => {
    const s = desdeApi([{ dia: 6, cerrado: true, tramos: [] }, { dia: 1, cerrado: false, tramos: [{ desde: 600, hasta: 1080 }] }]);
    expect(s[6]).toEqual({ estado: 'cerrado' });
    expect(resumenDia(s[1])).toBe('Abre 10:00 · cierra 18:00');
    expect(s[3]).toEqual({ estado: 'sin-dato' });
    expect(desdeApi(aDiasApi(s))).toEqual(s);
  });

  it('validarSemana pasa lo correcto', () => {
    expect(validarSemana(personalizado(semanaVacia(), [1], { abre: h(9), cierra: h(18) }).semana).ok).toBe(true);
  });
});

describe('resumenDia', () => {
  it('describe cada estado en palabras simples', () => {
    expect(resumenDia({ estado: 'sin-dato' })).toBe('Sin dato');
    expect(resumenDia({ estado: 'cerrado' })).toBe('Cerrado');
  });
});
