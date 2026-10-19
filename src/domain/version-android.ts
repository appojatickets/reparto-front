/** Las publicaciones usan el mismo número que versionCode del APK firmado. Nunca comparar etiquetas como texto. */
export const hayVersionAndroidNueva = (codigoInstalado: number, etiquetaPublicada: string): boolean => {
  if (!Number.isSafeInteger(codigoInstalado) || codigoInstalado < 1) return false;
  const coincidencia = /^android-v(\d+)$/.exec(etiquetaPublicada);
  const codigoPublicado = coincidencia?.[1] === undefined ? Number.NaN : Number(coincidencia[1]);
  return Number.isSafeInteger(codigoPublicado) && codigoPublicado > codigoInstalado;
};
