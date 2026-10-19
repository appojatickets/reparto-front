import type { VersionInstaladaAndroid } from '../../../application/ports/descarga-android';
import { registerPlugin } from '@capacitor/core';
import type { Tokens } from '../../../application/modelos';
import type { EstadoSeguimientoNativo } from '../../../application/ports/seguimiento-nativo';
export interface NativeBridge {
  requestNotifications(): Promise<void>;
  appInfo(): Promise<VersionInstaladaAndroid>;
  configure(options: { apiUrl: string }): Promise<void>;
  session(): Promise<{ tokens: Tokens | null }>;
  clear(): Promise<void>;
  request(options: { method: string; path: string; body?: string; authenticated: boolean }): Promise<{ status: number; body: string; tokens: Tokens | null }>;
  start(options: { jornadaId: string }): Promise<void>;
  stop(): Promise<void>;
  status(): Promise<EstadoSeguimientoNativo>;
}
export const nativeBridge = registerPlugin<NativeBridge>('RepartoNative');
