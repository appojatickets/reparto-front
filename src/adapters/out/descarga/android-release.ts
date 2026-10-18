import type { ConsultarAndroid } from '../../../application/ports/descarga-android';

const PUBLICACIONES = 'https://api.github.com/repos/appojatickets/reparto-front/releases/latest';
const objeto = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const enlaceOficial = (value: unknown): value is string => typeof value === 'string' &&
  /^https:\/\/github\.com\/appojatickets\/reparto-front\/releases\/download\/android-v\d+\/reparto\.apk$/.test(value);

/** Consulta sin credenciales. Un error no debe ofrecer una descarga rota ni un APK debug. */
export const crearConsultaAndroid = (pedir: typeof fetch = fetch): ConsultarAndroid => async (signal) => {
  try {
    const r = await pedir(PUBLICACIONES, { signal, credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } });
    if (r.status === 404) return { tipo: 'preparando' };
    if (!r.ok) return { tipo: 'sin_conexion' };
    const data: unknown = await r.json();
    if (!objeto(data) || data['draft'] !== false || data['prerelease'] !== false || !Array.isArray(data['assets'])) return { tipo: 'preparando' };
    const tag = data['tag_name'];
    if (typeof tag !== 'string' || !/^android-v\d+$/.test(tag)) return { tipo: 'preparando' };
    const asset: unknown = data['assets'].find((a: unknown) => objeto(a) && a['name'] === 'reparto.apk');
    if (!objeto(asset) || !enlaceOficial(asset['browser_download_url']) || typeof asset['size'] !== 'number' || asset['size'] <= 0 || asset['state'] !== 'uploaded') return { tipo: 'preparando' };
    if (!asset['browser_download_url'].includes(`/download/${tag}/`)) return { tipo: 'preparando' };
    return { tipo: 'lista', apk: { version: tag, url: asset['browser_download_url'], tamanoBytes: asset['size'] } };
  } catch { return { tipo: 'sin_conexion' }; }
};
