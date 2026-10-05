import { describe, expect, it } from 'vitest';
import { fechaYHoraEnChile, MOTIVOS_FOTO, textoDeMotivo } from './foto-reporte';

describe('reporte de fotos', () => {
  it('cada motivo tiene su texto', () => {
    expect(MOTIVOS_FOTO.map((m) => m.id)).toEqual(['no_es_la_fachada', 'se_ven_personas', 'borrosa', 'otra']);
    expect(textoDeMotivo('se_ven_personas')).toBe('Se ven personas');
  });

  it('la fecha se muestra en hora de Chile y sin dato queda vacía', () => {
    // 15:58 UTC en octubre = 12:58 en Chile (UTC-3 en horario de verano).
    expect(fechaYHoraEnChile('2026-10-05T15:58:00.000Z')).toMatch(/12:58/);
    expect(fechaYHoraEnChile(undefined)).toBe('');
    expect(fechaYHoraEnChile('no es fecha')).toBe('');
  });
});
