import { describe, expect, it } from 'vitest';
import { formatoPesos, formatoRut, textoParaCompartir } from './compartir-local';

describe('formatoPesos', () => {
  it('escribe pesos chilenos con punto de miles', () => {
    expect(formatoPesos(1234567)).toBe('$1.234.567');
    expect(formatoPesos(0)).toBe('$0');
    expect(formatoPesos(150000.4)).toBe('$150.000');
  });
});

describe('formatoRut', () => {
  it('pone puntos y guion; lo que no parece un RUT queda como vino', () => {
    expect(formatoRut('77975918-0')).toBe('77.975.918-0');
    expect(formatoRut('12345678-5')).toBe('12.345.678-5');
    expect(formatoRut('5-1')).toBe('5-1');
    expect(formatoRut('raro')).toBe('raro');
  });
});

describe('textoParaCompartir', () => {
  const local = { razonSocial: 'Rabelo Mágica SpA', rut: '77975918-0', direccion: 'Av. Colón Sur 765', comuna: 'San Bernardo', lat: -33.5972, lng: -70.7019 };

  it('arma el mensaje con nombre, RUT, dirección y el enlace al pin', () => {
    expect(textoParaCompartir(local)).toBe(
      ['Rabelo Mágica SpA', 'RUT 77.975.918-0', 'Av. Colón Sur 765, San Bernardo', 'Ubicación: https://www.google.com/maps/search/?api=1&query=-33.5972,-70.7019'].join('\n'),
    );
  });

  it('sin RUT ni pin omite esas líneas y lo dice', () => {
    expect(textoParaCompartir({ razonSocial: 'Kiosko Sol', direccion: 'Calle 1 10', comuna: 'Maipú' })).toBe(['Kiosko Sol', 'Calle 1 10, Maipú', 'Ubicación: sin pin todavía'].join('\n'));
  });

  it('puede sumar lo entregado', () => {
    expect(textoParaCompartir({ ...local, entregas: 3, recaudado: 450000 })).toContain('Entregado: $450.000 en 3 facturas');
    expect(textoParaCompartir({ ...local, entregas: 1, recaudado: 1000 })).toContain('Entregado: $1.000 en 1 factura');
    expect(textoParaCompartir({ ...local, entregas: 0, recaudado: 0 })).not.toContain('Entregado');
  });
});
