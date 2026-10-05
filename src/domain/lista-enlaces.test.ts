import { describe, expect, it } from 'vitest';
import { analizarListaEnlaces, esListaDeEnlaces, tipoDeEnlace } from './lista-enlaces';

const CORTO = 'https://maps.app.goo.gl/Unz8sebYG5ooFVh66';
const BUSQUEDA = 'https://www.google.com/maps/search/?api=1&query=Los+Suspiros+16463+San+Bernardo%2C+Chile';

describe('lista de direcciones con enlace de Google Maps', () => {
  it('reconoce los enlaces cortos y los de búsqueda de Google Maps, y nada más', () => {
    expect(tipoDeEnlace(CORTO)).toBe('corto');
    expect(tipoDeEnlace(BUSQUEDA)).toBe('busqueda');
    expect(tipoDeEnlace('https://www.google.com/maps/place/Algo/@-33.59,-70.70,17z')).toBe('otro');
    expect(tipoDeEnlace('https://waze.com/ul?ll=-33.5,-70.7')).toBeUndefined();
    expect(tipoDeEnlace('no es un enlace')).toBeUndefined();
  });

  it('detecta la lista, pero no una planilla ni una lista de pines de Google Maps', () => {
    expect(esListaDeEnlaces(`Avenida Portales 4180, San Bernardo\n\n${CORTO}`)).toBe(true);
    expect(esListaDeEnlaces('RUT;Razón social;Dirección;Comuna\n1-9;Kiosko;Calle 1;Maipú')).toBe(false);
    expect(esListaDeEnlaces(`Pin colocado\nKiosko Sol\n${CORTO}`)).toBe(false);
  });

  it('une cada dirección con su enlace corto (con o sin línea en blanco) y separa la comuna', () => {
    const { entradas, resumen } = analizarListaEnlaces(`Avenida Portales 4180, San Bernardo\n\n${CORTO}\n\nRegina Gálvez 111, San Bernardo\nhttps://maps.app.goo.gl/WqQXpD24yqCztJJ46`);
    expect(entradas).toHaveLength(2);
    expect(entradas[0]).toMatchObject({ numero: 1, estado: 'lista', direccion: 'Avenida Portales 4180', comuna: 'San Bernardo', enlace: CORTO, tipoEnlace: 'corto' });
    expect(entradas[1]).toMatchObject({ direccion: 'Regina Gálvez 111', comuna: 'San Bernardo', tipoEnlace: 'corto' });
    expect(resumen).toEqual({ total: 2, listas: 2, revisar: 0, repetidas: 0, conLugarExacto: 2, porBusqueda: 0 });
  });

  it('el enlace de búsqueda no trae lugar: queda para que el sistema busque la dirección; la comuna va al final sin coma', () => {
    const { entradas, resumen } = analizarListaEnlaces(`Los Suspiros 16463 San Bernardo\n${BUSQUEDA}\n\nAlfredo Torres Jiménez 10 Buin\nhttps://www.google.com/maps/search/?api=1&query=Alfredo+Torres+Jim%C3%A9nez+10+Buin%2C+Chile`);
    expect(entradas[0]).toMatchObject({ direccion: 'Los Suspiros 16463', comuna: 'San Bernardo', tipoEnlace: 'busqueda' });
    expect(entradas[1]).toMatchObject({ direccion: 'Alfredo Torres Jiménez 10', comuna: 'Buin' });
    expect(resumen).toMatchObject({ listas: 2, conLugarExacto: 0, porBusqueda: 2 });
  });

  it('un enlace de búsqueda sin línea de dirección usa la dirección que lleva dentro', () => {
    const { entradas } = analizarListaEnlaces(BUSQUEDA);
    expect(entradas[0]).toMatchObject({ estado: 'lista', direccion: 'Los Suspiros 16463', comuna: 'San Bernardo' });
  });

  it('una dirección sin comuna, o un enlace sin dirección, queda para revisar con el motivo', () => {
    const { entradas, resumen } = analizarListaEnlaces(`Calle Inventada 123\n${CORTO}\n\n${CORTO.replace('Unz', 'Abc')}`);
    expect(entradas[0]).toMatchObject({ estado: 'revisar', motivos: [expect.stringContaining('Falta la comuna')] });
    expect(entradas[1]).toMatchObject({ estado: 'revisar', motivos: ['Falta la dirección.'] });
    expect(resumen.revisar).toBe(2);
  });

  it('la misma dirección dos veces entra una sola, con el enlace que trae el lugar exacto', () => {
    const { entradas, resumen } = analizarListaEnlaces(`Los Suspiros 16463 San Bernardo\n${BUSQUEDA}\n\nlos suspiros 16463, San Bernardo\nhttps://maps.app.goo.gl/XYZ123`);
    expect(entradas.map((e) => e.estado)).toEqual(['repetida', 'lista']);
    expect(entradas[1]?.tipoEnlace).toBe('corto');
    expect(resumen).toMatchObject({ listas: 1, repetidas: 1, conLugarExacto: 1 });
  });

  it('una dirección sin enlace dentro de la lista también se importa (queda por búsqueda)', () => {
    const { entradas } = analizarListaEnlaces(`Pasaje 7 2716 San Bernardo\nFreire 917 San Bernardo\n${CORTO}`);
    expect(entradas).toHaveLength(2);
    expect(entradas[0]).toMatchObject({ estado: 'lista', direccion: 'Pasaje 7 2716' });
    expect(entradas[0]?.tipoEnlace).toBeUndefined();
    expect(entradas[1]).toMatchObject({ direccion: 'Freire 917', tipoEnlace: 'corto' });
  });

  it('un enlace que no es de Google Maps se avisa y se importa solo la dirección', () => {
    const { entradas } = analizarListaEnlaces(`Freire 917 San Bernardo https://ejemplo.cl/x\nOtra 1 Maipú\n${CORTO}`);
    expect(entradas[0]).toMatchObject({ estado: 'lista', direccion: 'Freire 917' });
    expect(entradas[0]?.motivos[0]).toContain('no es de Google Maps');
    expect(entradas[0]?.enlace).toBeUndefined();
  });
});
