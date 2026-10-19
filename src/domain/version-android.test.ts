import { describe, expect, it } from 'vitest';
import { hayVersionAndroidNueva } from './version-android';

describe('comparación del APK publicado con el instalado', () => {
  it('compara números: 10 es posterior a 9, no al revés', () => {
    expect(hayVersionAndroidNueva(9, 'android-v10')).toBe(true);
    expect(hayVersionAndroidNueva(10, 'android-v9')).toBe(false);
    expect(hayVersionAndroidNueva(10, 'android-v10')).toBe(false);
    expect(hayVersionAndroidNueva(10, 'android-v11')).toBe(true);
  });
  it('no recomienda versiones desconocidas ni usa una versión instalada inválida', () => {
    for (const etiqueta of ['v11', 'android-v', 'android-v11-beta', 'android-vNaN', 'android-v9007199254740992', 'android-v0']) expect(hayVersionAndroidNueva(10, etiqueta)).toBe(false);
    for (const codigo of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(hayVersionAndroidNueva(codigo, 'android-v11')).toBe(false);
  });
});
