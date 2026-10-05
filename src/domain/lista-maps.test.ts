import { describe, expect, it } from 'vitest';
import { analizarListaMaps, completarEntrada, esListaDeMaps, filasParaImportar, ordenarTexto, resumir } from './lista-maps';

const uno = (texto: string) => {
  const { entradas } = analizarListaMaps(texto);
  expect(entradas).toHaveLength(1);
  const [e] = entradas;
  if (!e) throw new Error('sin entrada');
  return e;
};

describe('ordenarTexto', () => {
  it('pone mayúsculas a los nombres y deja las partículas y las siglas', () => {
    expect(ordenarTexto('rosa del carmen gonzalez osses')).toBe('Rosa del Carmen Gonzalez Osses');
    expect(ordenarTexto('MINIMARKET JOSE MOYA LOBOS EIRL')).toBe('Minimarket Jose Moya Lobos EIRL');
    expect(ordenarTexto('gochef spa')).toBe('Gochef SpA');
    expect(ordenarTexto('camino padre hurtado 4615')).toBe('Camino Padre Hurtado 4615');
    expect(ordenarTexto('Av 18 de septiembre 2124')).toBe('Av 18 de Septiembre 2124');
    expect(ordenarTexto('parcela 7a  sitio 3')).toBe('Parcela 7A Sitio 3');
  });
});

describe('lista de Google Maps: una entrada', () => {
  it('reconoce que es una lista de Google Maps', () => {
    expect(esListaDeMaps('Pin colocado\n-33.5,-70.7\nX')).toBe(true);
    expect(esListaDeMaps('rut;razon social\n1;a')).toBe(false);
  });

  it('pin colocado con coordenadas y nombre: queda lista, pero sin dirección falta algo', () => {
    const e = uno('Pin colocado\n-33.797267,-70.776552\nVentas de alimentos dafna');
    expect(e).toMatchObject({ origen: 'pin_colocado', lat: -33.797267, lng: -70.776552, razonSocial: 'Ventas de Alimentos Dafna', estado: 'revisar' });
    expect(e.motivos.join(' ')).toContain('Falta la dirección');
  });

  it('nombre, dirección escrita con la comuna al final y pin: se ordena todo', () => {
    const e = uno('Pin colocado\n-33.606873,-70.917985\nrosa del carmen gonzalez osses\ncamino mallarauco 16 melipilla');
    expect(e).toMatchObject({ estado: 'lista', razonSocial: 'Rosa del Carmen Gonzalez Osses', direccion: 'Camino Mallarauco 16', comuna: 'Melipilla', lat: -33.606873 });
  });

  it('la dirección puede venir antes que el nombre', () => {
    const e = uno('Pin colocado\nCerca de Av. Hernán Prieto, Pirque, Región Metropolitana\navenida concha y toro 4089\nolga virginia aguilera toledo');
    expect(e).toMatchObject({ estado: 'lista', razonSocial: 'Olga Virginia Aguilera Toledo', direccion: 'Avenida Concha y Toro 4089', comuna: 'Pirque' });
    expect(e.nota).toContain('Cerca de Av. Hernán Prieto');
  });

  it('«Cerca de …» sin dirección escrita: aproximada, con la referencia como dirección', () => {
    const e = uno('Pin colocado\nCerca de Botilleria Nolasko - Lonquén Nte. 12000, Calera de Tango, Región Metropolitana\nclemencia del carmen muñoz bravo');
    expect(e).toMatchObject({ estado: 'aproximada', comuna: 'Calera de Tango', direccion: 'Botilleria Nolasko - Lonquén Nte. 12000' });
  });

  it('«Cerca de Paine» sin nada más: para revisar, con el motivo', () => {
    const e = uno('Pin colocado\nCerca de Paine, Región Metropolitana\nGisela Andrea Carrasco Guajardo');
    expect(e.estado).toBe('revisar');
    expect(e.comuna).toBe('Paine');
    expect(e.motivos.join(' ')).toContain('Falta la dirección');
  });

  it('el código postal y la provincia no confunden la comuna', () => {
    const e = uno('Pin colocado\nCerca de Lipigas S.A. - Santelices 308, 9650000 Isla de Maipo, Región Metropolitana\ncomercial alpam spa\nsantelices 299');
    expect(e).toMatchObject({ estado: 'lista', comuna: 'Isla de Maipo', razonSocial: 'Comercial Alpam SpA', direccion: 'Santelices 299' });
  });

  it('ubicación compartida por WhatsApp con coordenadas', () => {
    const e = uno('Ubicación compartida\n-33.195162,-70.682856\nLas araucarias calle el peehuen 861 colina');
    expect(e).toMatchObject({ origen: 'ubicacion_compartida', lat: -33.195162, lng: -70.682856, comuna: 'Colina' });
  });

  it('coordenadas en grados, minutos y segundos', () => {
    const e = uno('33°44\'23.3"S 70°44\'54.7"W\nComercializadora freyddy Figueroa eir\nlos naranjos 12 buin');
    expect(e.lat).toBeCloseTo(-33.739806, 5);
    expect(e.lng).toBeCloseTo(-70.748528, 5);
  });

  it('un pin fuera de la Región Metropolitana no se usa y queda para revisar', () => {
    const e = uno('Pin colocado\n-33.4,-72.5\nJulia Soto\ncalle larga 12 buin');
    expect(e.estado).toBe('revisar');
    expect(e.lat).toBeUndefined();
    expect(e.motivos.join(' ')).toContain('fuera de la Región Metropolitana');
  });

  it('los sectores (Chicureo, Batuco…) se reconocen y un apellido como «Villa» no se toma por calle', () => {
    expect(uno('Pin colocado\nCerca de Chicureo, Colina, Región Metropolitana\nMiguel Aguilar\nchicureo parcela 1')).toMatchObject({ comuna: 'Colina', direccion: 'Chicureo Parcela 1' });
    expect(uno('Pin colocado\n-33.2,-70.7\nMiguel Aguilar\nchicureo parcela 1').comuna).toBe('Colina');
    const e = uno('Pin colocado\nCerca de Av. Julio Vrancken 2211, Talagante, Región Metropolitana\nJorge Antonio villa jara\nRutenio 1001');
    expect(e).toMatchObject({ estado: 'lista', razonSocial: 'Jorge Antonio Villa Jara', direccion: 'Rutenio 1001' });
  });

  it('un nombre de prueba o una referencia fuera de la RM se marcan para revisar; la referencia repetida no ensucia la nota', () => {
    expect(uno('Cl. El Volcan\nPuente Alto\nRegión Metropolitana\nHahahahahaha\nBsbdiwbwjwsjwj').estado).toBe('revisar');
    const fuera = uno("Pin colocado\nCerca de Valdivia 700-798, San Fernando, O'Higgins\nLibrería acuario");
    expect(fuera.motivos.join(' ')).toContain('fuera de la Región Metropolitana');
    const e = uno('Pin colocado\nCerca de Heraclio Mena López, Peñaflor, Región Metropolitana\nNatalie Saavedra\nHeraclio Mena López 53');
    expect(e.nota).toBeUndefined();
  });

  it('ficha de Google con valoración: el título es el nombre comercial y la categoría el giro', () => {
    const e = uno('Minimarket Los Girasoles\n4.8(16)\nTienda general\nPaulina rojas colina');
    expect(e).toMatchObject({ giro: 'Tienda General', comuna: 'Colina', razonSocial: 'Paulina Rojas' });
    expect(e.nota).toContain('Nombre comercial: Minimarket Los Girasoles');
  });

  it('ficha con solo la dirección escrita: el nombre sale de Google y se avisa', () => {
    const e = uno('Good Food STM\n4.0(1)\nRestaurante de comida rápida\nQuilapillun sitio 6 til til');
    expect(e).toMatchObject({ razonSocial: 'Good Food STM', direccion: 'Quilapillun Sitio 6', comuna: 'Tiltil', estado: 'lista' });
    expect(e.nota).toContain('Nombre tomado de Google');
  });

  it('ficha sin valoración: título y categoría conocida', () => {
    const e = uno('Ferreteria Paseo las Brisas\nFerretería\nSan martin 19000 lampa');
    expect(e).toMatchObject({ giro: 'Ferretería', razonSocial: 'Ferreteria Paseo las Brisas', direccion: 'San Martin 19000', comuna: 'Lampa' });
  });

  it('dirección de Google (calle, código postal y comuna, región) más la nota del equipo', () => {
    const e = uno('Fray Camilo Henríquez 488-466\nColina\nRegión Metropolitana\nruben ramirez moeales');
    expect(e).toMatchObject({ comuna: 'Colina', razonSocial: 'Ruben Ramirez Moeales', direccion: 'Fray Camilo Henríquez 488-466' });
    const f = uno('Los Corrales 1512\n9340000 Colina\nRegión Metropolitana\nAlmacén Lucía Pérez');
    expect(f).toMatchObject({ comuna: 'Colina', direccion: 'Los Corrales 1512', razonSocial: 'Almacén Lucía Pérez' });
  });

  it('un lugar de otra región queda para revisar', () => {
    const e = uno('Pin colocado\nCerca de Valdivia 700-798, San Fernando, O\'Higgins\nLibrería acuario');
    expect(e.estado).toBe('revisar');
  });

  it('«cerrado permanentemente» descarta la entrada; «ya no existe» solo deja una nota', () => {
    expect(uno('Minimercado Panaderia Romi\n4.5(48)\nCerrado permanentemente\nAv franc mzn 66 sitio 21 lampa').estado).toBe('descartada');
    const e = uno('Cam. Chada 124\nEste lugar ya no existe\nAndrea cabrera barriga\nCamino chada 124-1 paine');
    expect(e.estado).toBe('lista');
    expect(e.nota).toContain('este lugar ya no existe');
  });

  it('horario, teléfono y observaciones van a la nota, no al nombre ni a la dirección', () => {
    const e = uno('Pin colocado\n-33.7,-70.9\nPamela Tapia Huerta\nParcela 26 la manga san pedro\n+ 9 am a 8 pm horario continuo\n+56964210408 Rodrigo romero\nCasa amarilla');
    expect(e.razonSocial).toBe('Pamela Tapia Huerta');
    expect(e.direccion).toBe('Parcela 26 la Manga');
    expect(e.comuna).toBe('San Pedro');
    expect(e.nota).toContain('Horario: 9 am a 8 pm horario continuo');
    expect(e.nota).toContain('Tel: +56964210408 Rodrigo romero');
    expect(e.nota).toContain('Obs: Casa amarilla');
  });
});

describe('lista de Google Maps: varias entradas', () => {
  const texto = `Pin colocado
-33.797267,-70.776552
Ventas de alimentos dafna


Pin colocado
Cerca de Av. Hernán Prieto, Pirque, Región Metropolitana
Elias Hernán Vidal pradines

Calle doctor García 236


Pin colocado
Cerca de G-46 2681, Buin, Región Metropolitana
Camino Paine lonquen 2855

Manuel Neira


Mapocho Sur 8188
Este lugar ya no existe


Pin colocado
-33.7,-70.7
Ana Pérez
Calle 1 100 buin


Pin colocado
-33.7,-70.7
ana perez
calle 1 100 buin`;

  it('los bloques sueltos se pegan a la entrada anterior si le falta el nombre o la dirección', () => {
    const { entradas } = analizarListaMaps(texto);
    expect(entradas.map((e) => [e.razonSocial, e.direccion])).toEqual([
      ['Ventas de Alimentos Dafna', undefined],
      ['Elias Hernán Vidal Pradines', 'Calle Doctor García 236'],
      ['Manuel Neira', 'Camino Paine Lonquen 2855'],
      [undefined, 'Mapocho Sur 8188'],
      ['Ana Pérez', 'Calle 1 100'],
      ['Ana Perez', 'Calle 1 100'],
    ]);
  });

  it('el resumen cuenta listas, aproximadas, para revisar y descartadas', () => {
    const { resumen } = analizarListaMaps(texto);
    expect(resumen).toMatchObject({ total: 6, listas: 4, revisar: 2, descartadas: 0, conPin: 3, sinPinEnElTexto: 3 });
  });

  it('las filas para importar traen solo lo listo (y las aproximadas si se piden), con el pin como texto', () => {
    const { entradas } = analizarListaMaps(`${texto}\n\n\nPin colocado\nCerca de Botilleria Nolasko, Calera de Tango, Región Metropolitana\nClemencia Muñoz`);
    expect(filasParaImportar(entradas, false)).toHaveLength(4);
    const con = filasParaImportar(entradas, true);
    expect(con).toHaveLength(5);
    expect(con[0]).toEqual({ razonSocial: 'Elias Hernán Vidal Pradines', direccion: 'Calle Doctor García 236', comuna: 'Pirque', nota: 'Cerca de Av. Hernán Prieto' });
    expect(con[2]).toMatchObject({ lat: '-33.7', lng: '-70.7', comuna: 'Buin' });
  });
});

describe('completar una entrada a mano', () => {
  it('con la comuna que faltaba queda lista y entra a la importación; sin ella sigue para revisar', () => {
    const { entradas } = analizarListaMaps('Pin colocado\n-33.606873,-70.917985\nrosa gonzalez osses\ncamino mallarauco 16');
    const e = entradas[0];
    if (!e) throw new Error('sin entrada');
    expect(e.estado).toBe('revisar');
    expect(completarEntrada(e, { comuna: '  ' }).estado).toBe('revisar');
    expect(completarEntrada(e, { comuna: 'Mentira' }).estado).toBe('revisar');
    const lista = completarEntrada(e, { comuna: 'Melipilla' });
    expect(lista).toMatchObject({ estado: 'lista', comuna: 'Melipilla', motivos: [], lat: -33.606873 });
    expect(filasParaImportar([lista], false)).toEqual([{ razonSocial: 'Rosa Gonzalez Osses', direccion: 'Camino Mallarauco 16', comuna: 'Melipilla', lat: '-33.606873', lng: '-70.917985' }]);
    expect(resumir([lista, e])).toMatchObject({ total: 2, listas: 1, revisar: 1, conPin: 2 });
  });

  it('completa nombre y dirección que faltaban; una descartada no cambia', () => {
    const { entradas } = analizarListaMaps('Eliodoro Yañez 1909\n8082075 San Bernardo\nRegión Metropolitana');
    const e = entradas[0];
    if (!e) throw new Error('sin entrada');
    expect(e).toMatchObject({ estado: 'revisar', direccion: 'Eliodoro Yañez 1909', comuna: 'San Bernardo' });
    expect(completarEntrada(e, { razonSocial: 'Kiosko Pepe' }).estado).toBe('lista');
    const d = analizarListaMaps('Panaderia X\n4.5(48)\nCerrado permanentemente\nAv franc 66 lampa').entradas[0];
    if (!d) throw new Error('sin entrada');
    expect(completarEntrada(d, { comuna: 'Lampa' })).toBe(d);
  });
});
