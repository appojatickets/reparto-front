/** Solo ofrece versiones de distribución con firma permanente, nunca APK de depuración. */
export type VersionAndroid = { readonly version: string; readonly url: string; readonly tamanoBytes: number };
export type EstadoDescargaAndroid =
  | { readonly tipo: 'lista'; readonly apk: VersionAndroid }
  | { readonly tipo: 'preparando' }
  | { readonly tipo: 'sin_conexion' };
export type ConsultarAndroid = (signal: AbortSignal) => Promise<EstadoDescargaAndroid>;
