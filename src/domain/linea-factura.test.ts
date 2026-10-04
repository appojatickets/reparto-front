import { describe, expect, it } from 'vitest';
import { leerLineaFactura } from './linea-factura';

describe('leerLineaFactura', () => {
  it('folio al comienzo y el resto es el cliente', () => {
    expect(leerLineaFactura('1234 minimarket rabet')).toEqual({ folio: '1234', consulta: 'minimarket rabet' });
  });

  it('ignora «factura», «folio», «número» al comienzo, con o sin tilde y puntos', () => {
    expect(leerLineaFactura('factura 1234 minimarket rabet')).toEqual({ folio: '1234', consulta: 'minimarket rabet' });
    expect(leerLineaFactura('Factura número 1234 Minimarket Rabet')).toEqual({ folio: '1234', consulta: 'Minimarket Rabet' });
    expect(leerLineaFactura('folio n° 1234 kiosko sol')).toEqual({ folio: '1234', consulta: 'kiosko sol' });
    expect(leerLineaFactura('Nº. 1234 kiosko sol')).toEqual({ folio: '1234', consulta: 'kiosko sol' });
  });

  it('quita los puntos de miles que pone el dictado', () => {
    expect(leerLineaFactura('1.234 rabet')).toEqual({ folio: '1234', consulta: 'rabet' });
  });

  it('acepta un folio con letras y guion', () => {
    expect(leerLineaFactura('F-1234 rabet')).toEqual({ folio: 'F-1234', consulta: 'rabet' });
  });

  it('si el número va al final y tiene 3 o más cifras, es el folio', () => {
    expect(leerLineaFactura('minimarket rabet 1234')).toEqual({ folio: '1234', consulta: 'minimarket rabet' });
  });

  it('un número dentro del nombre no se confunde con el folio', () => {
    expect(leerLineaFactura('bazar 24 horas')).toEqual({ consulta: 'bazar 24 horas' });
    expect(leerLineaFactura('1234 bazar 24 horas')).toEqual({ folio: '1234', consulta: 'bazar 24 horas' });
    expect(leerLineaFactura('bazar 24')).toEqual({ consulta: 'bazar 24' });
  });

  it('sin número no hay folio; solo el número tampoco busca cliente', () => {
    expect(leerLineaFactura('minimarket rabet')).toEqual({ consulta: 'minimarket rabet' });
    expect(leerLineaFactura('1234')).toEqual({ folio: '1234', consulta: '' });
    expect(leerLineaFactura('   ')).toEqual({ consulta: '' });
  });

  it('si no hay folio después de «factura», esas palabras se conservan: pueden ser parte del nombre', () => {
    expect(leerLineaFactura('no me olvides')).toEqual({ consulta: 'no me olvides' });
    expect(leerLineaFactura('la esquina')).toEqual({ consulta: 'la esquina' });
  });

  it('entiende el folio dicho con palabras, cardinal o dígito por dígito', () => {
    expect(leerLineaFactura('mil doscientos treinta y cuatro minimarket rabet')).toEqual({ folio: '1234', consulta: 'minimarket rabet' });
    expect(leerLineaFactura('factura siete mil uno parque arauco')).toEqual({ folio: '7001', consulta: 'parque arauco' });
    expect(leerLineaFactura('siete cero cero uno plaza oeste')).toEqual({ folio: '7001', consulta: 'plaza oeste' });
  });

  it('un nombre que empieza con un número corto en palabras no se toma por folio', () => {
    expect(leerLineaFactura('dos hermanos')).toEqual({ consulta: 'dos hermanos' });
    expect(leerLineaFactura('tres marias')).toEqual({ consulta: 'tres marias' });
  });
});
