import { describe, expect, it } from 'vitest';
import { COMUNAS_RM } from './comunas';

describe('COMUNAS_RM', () => {
  it('son las 52 comunas, sin repetidas y en orden alfabético para el selector', () => {
    expect(COMUNAS_RM).toHaveLength(52);
    expect(new Set(COMUNAS_RM).size).toBe(52);
    expect([...COMUNAS_RM].sort((a, b) => a.localeCompare(b, 'es'))).toEqual(COMUNAS_RM);
  });
});
