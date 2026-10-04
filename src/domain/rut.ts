const FACTORES = [2, 3, 4, 5, 6, 7];

/** Dígito verificador por módulo 11. */
const digitoVerificador = (cuerpo: number): string => {
  let suma = 0;
  let i = 0;
  for (let resto = cuerpo; resto > 0; resto = Math.floor(resto / 10)) {
    suma += (resto % 10) * (FACTORES[i % FACTORES.length] ?? 0);
    i++;
  }
  const dv = 11 - (suma % 11);
  return dv === 11 ? '0' : dv === 10 ? 'K' : String(dv);
};

/**
 * Deja el RUT en la forma que guarda el sistema (`77975918-0`). Acepta con o sin puntos y guion y, como el RUT son
 * números que no cambian, también **sin dígito verificador** (se calcula). Devuelve `undefined` si no calza.
 */
export const completarRut = (texto: string): string | undefined => {
  const limpio = texto.replace(/[.\s-]/g, '').toUpperCase();
  if (/^\d{6,8}$/.test(limpio)) {
    const cuerpo = Number(limpio);
    return `${cuerpo}-${digitoVerificador(cuerpo)}`;
  }
  const m = /^(\d{6,8})([\dK])$/.exec(limpio);
  if (!m) return undefined;
  const cuerpo = Number(m[1]);
  return digitoVerificador(cuerpo) === m[2] ? `${cuerpo}-${m[2]}` : undefined;
};

export const formatearRut = (rut: string): string => {
  const [cuerpo = '', dv = ''] = rut.split('-');
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
};
