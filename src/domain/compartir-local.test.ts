import { describe, expect, it } from 'vitest';
import { formatoRut, lineaEntregas, textoParaCompartir } from './compartir-local';

describe('lineaEntregas', () => {
  it('cuenta las entregas hechas, en singular o plural', () => {
    expect(lineaEntregas(1)).toBe('1 entrega hecha');
    expect(lineaEntregas(3)).toBe('3 entregas hechas');
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

  it('puede sumar cuántas entregas tiene, sin montos', () => {
    expect(textoParaCompartir({ ...local, entregas: 3 })).toContain('3 entregas hechas');
    expect(textoParaCompartir({ ...local, entregas: 1 })).toContain('1 entrega hecha');
    expect(textoParaCompartir({ ...local, entregas: 0 })).not.toContain('entrega');
    expect(textoParaCompartir({ ...local, entregas: 3 })).not.toContain('$');
  });
});
