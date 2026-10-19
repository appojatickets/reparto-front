import { useEffect, useState } from 'react';
import type { VersionAndroid } from '../../../../application/ports/descarga-android';
import { hayVersionAndroidNueva } from '../../../../domain/version-android';
import { useCasos } from '../contexto';
import { Boton } from './ui';

const ESPERAR_ENTRE_CONSULTAS_MS = 15 * 60_000;
const REVISAR_MS = 30 * 60_000;

/** Aviso voluntario del APK: comprobar no equivale a descargar ni a instalar. En la web se conserva la actualización de la PWA. */
export const AvisoActualizacionAndroid = () => {
  const { consultarAndroid, versionAndroid, ahora } = useCasos();
  const [nueva, setNueva] = useState<VersionAndroid | undefined>();
  const [descartada, setDescartada] = useState<string | undefined>();
  const [instalada, setInstalada] = useState<number | undefined>();
  useEffect(() => {
    if (!consultarAndroid || !versionAndroid) return;
    let vigente = true;
    let ultimoIntento: number | undefined;
    let consultando = false;
    let control: AbortController | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const consultar = async (forzar = false): Promise<void> => {
      if (!vigente || consultando || document.visibilityState !== 'visible') return;
      const momento = ahora().getTime();
      if (!forzar && ultimoIntento !== undefined && momento - ultimoIntento < ESPERAR_ENTRE_CONSULTAS_MS) return;
      ultimoIntento = momento;
      consultando = true;
      const solicitud = new AbortController();
      const cancelada = (): boolean => !vigente || solicitud.signal.aborted;
      control = solicitud;
      timeout = setTimeout(() => { solicitud.abort(); }, 12_000);
      try {
        const info = await versionAndroid();
        // El APK piloto lleva otro identificador y no puede actualizarse con el APK de distribución.
        if (info.paquete !== 'cl.reparto.app' || cancelada()) return;
        const resultado = await consultarAndroid(solicitud.signal);
        if (cancelada()) return;
        setInstalada(info.codigo);
        setNueva((anterior) => resultado.tipo === 'lista'
          ? hayVersionAndroidNueva(info.codigo, resultado.apk.version) ? resultado.apk : undefined
          : anterior && hayVersionAndroidNueva(info.codigo, anterior.version) ? anterior : undefined);
      } catch { /* Sin conexión o versión desconocida: el reparto sigue disponible. */ }
      finally { clearTimeout(timeout); consultando = false; }
    };
    const alVolver = (): void => { void consultar(); };
    const alConectar = (): void => { void consultar(true); };
    void consultar();
    const intervalo = window.setInterval(alVolver, REVISAR_MS);
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    window.addEventListener('online', alConectar);
    return () => {
      vigente = false; control?.abort(); if (timeout !== undefined) clearTimeout(timeout); window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver); window.removeEventListener('focus', alVolver); window.removeEventListener('online', alConectar);
    };
  }, [consultarAndroid, versionAndroid, ahora]);
  if (!nueva || nueva.version === descartada) return null;
  return <aside className="screen" aria-label="Actualización de Reparto"><div className="tarjeta">
    <strong role="status">Hay una nueva versión de Reparto</strong>
    <p>Instalada: v{instalada}. Disponible: {nueva.version.replace('android-', '')}. Puedes actualizar ahora o seguir repartiendo y hacerlo después.</p>
    <div className="fila-botones">
      <a className="big-button big-button--primario" href={nueva.url} target="_blank" rel="noreferrer">DESCARGAR ACTUALIZACIÓN</a>
      <Boton variante="secundario" onClick={() => { setDescartada(nueva.version); }}>MÁS TARDE</Boton>
    </div>
    <p className="ayuda">Abre reparto.apk cuando termine la descarga y confirma la actualización en Android. Instálala sobre la anterior, sin desinstalar.</p>
  </div></aside>;
};
