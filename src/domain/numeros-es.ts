export type NumeroHablado = { readonly digitos: string; readonly usados: number };

const sinTildes = (t: string): string => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[.,;:]+$/u, '');

const DIGITOS: Readonly<Record<string, number>> = { cero: 0, uno: 1, un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9 };
const ESPECIALES: Readonly<Record<string, number>> = {
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintiun: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26,
  veintisiete: 27, veintiocho: 28, veintinueve: 29,
};
const DECENAS: Readonly<Record<string, number>> = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
const CENTENAS: Readonly<Record<string, number>> = {
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400,
  quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800,
  novecientos: 900, novecientas: 900,
};

type Clase = 'inicio' | 'centena' | 'decena' | 'unidad' | 'especial' | 'mil';

/** Dígito por dígito: «siete cero cero uno» → 7001. Toma la secuencia más larga de palabras de dígito desde el comienzo. */
const dichoDigitoPorDigito = (tokens: readonly string[]): NumeroHablado | undefined => {
  let digitos = '';
  for (const t of tokens) {
    const d = DIGITOS[sinTildes(t)];
    if (d === undefined) break;
    digitos += String(d);
  }
  return digitos.length >= 2 ? { digitos, usados: digitos.length } : undefined;
};

/** Cardinal: «mil doscientos treinta y cuatro» → 1234. Solo acepta combinaciones válidas del castellano. */
const dichoCardinal = (tokens: readonly string[]): NumeroHablado | undefined => {
  let total = 0;
  let actual = 0;
  let clase: Clase = 'inicio';
  let usados = 0;
  let i = 0;
  while (i < tokens.length) {
    const t = sinTildes(tokens[i] ?? '');
    const centena = CENTENAS[t];
    const especial = ESPECIALES[t];
    const decena = DECENAS[t];
    const unidad = DIGITOS[t];
    if (centena !== undefined && (clase === 'inicio' || clase === 'mil')) {
      actual += centena;
      clase = 'centena';
    } else if (especial !== undefined && (clase === 'inicio' || clase === 'mil' || clase === 'centena')) {
      actual += especial;
      clase = 'especial';
    } else if (decena !== undefined && (clase === 'inicio' || clase === 'mil' || clase === 'centena')) {
      actual += decena;
      clase = 'decena';
    } else if (unidad !== undefined && unidad > 0 && (clase === 'inicio' || clase === 'mil' || clase === 'centena')) {
      actual += unidad;
      clase = 'unidad';
    } else if (t === 'y' && clase === 'decena') {
      const siguiente = DIGITOS[sinTildes(tokens[i + 1] ?? '')];
      if (siguiente === undefined || siguiente === 0) break;
      actual += siguiente;
      clase = 'unidad';
      i += 2;
      usados += 2;
      continue;
    } else if (unidad !== undefined && unidad > 0 && clase === 'decena') {
      break; // «treinta cuatro» no es un número: falta el «y»
    } else if (t === 'mil' && clase !== 'mil') {
      total += (actual === 0 ? 1 : actual) * 1000;
      actual = 0;
      clase = 'mil';
    } else break;
    i++;
    usados++;
  }
  if (usados === 0) return undefined;
  return { digitos: String(total + actual), usados };
};

/**
 * Lee un número dicho en palabras al comienzo de `tokens`, como lo entrega el dictado: «mil doscientos treinta y cuatro» o
 * «siete cero cero uno». Devuelve los dígitos y cuántas palabras usó. Solo sirve como folio si tiene 3 o más cifras
 * (así «dos hermanos» no se confunde con la factura 2).
 */
export const leerNumeroHablado = (tokens: readonly string[]): NumeroHablado | undefined => {
  const porDigitos = dichoDigitoPorDigito(tokens);
  const cardinal = dichoCardinal(tokens);
  const mejor = porDigitos && (!cardinal || porDigitos.usados >= cardinal.usados) ? porDigitos : cardinal;
  return mejor && mejor.digitos.length >= 3 ? mejor : undefined;
};
