import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { EstadoDescargaAndroid } from '../../../../application/ports/descarga-android';
import { useCasos } from '../contexto';
import { Aviso, Boton, Cargando, Pagina } from '../componentes/ui';

/** Descarga pública desde Reparto. La clave de firma nunca llega al navegador. */
export const PaginaAndroid = () => {
  const { consultarAndroid } = useCasos();
  const [estado, setEstado] = useState<EstadoDescargaAndroid | undefined>();
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vigente = true;
    const control = new AbortController();
    const timeout = window.setTimeout(() => { control.abort(); }, 12_000);
    const consultar = consultarAndroid ?? (() => Promise.resolve({ tipo: 'preparando' as const }));
    void consultar(control.signal).then((resultado) => {
      window.clearTimeout(timeout);
      if (vigente) setEstado(resultado);
    });
    return () => { vigente = false; control.abort(); window.clearTimeout(timeout); };
  }, [consultarAndroid, intento]);

  return <main className="screen"><Pagina titulo="App Android de Reparto">
    <p>Tu ruta, tus entregas y el GPS de jornada aunque abras Waze o bloquees la pantalla. Requiere Android 8 o posterior.</p>
    {!estado ? <Cargando texto="Buscando la última versión…" /> : estado.tipo === 'lista' ? <>
      <a className="big-button big-button--primario" href={estado.apk.url}>DESCARGAR APP ANDROID</a>
      <p className="ayuda">Versión {estado.apk.version} · {(estado.apk.tamanoBytes / 1_000_000).toFixed(1)} MB</p>
      <ol>
        <li>Abre el archivo <strong>reparto.apk</strong> descargado en tu teléfono.</li>
        <li>Si Android lo solicita, permite instalar desde este navegador y confirma la instalación.</li>
        <li>Abre Reparto, inicia sesión y selecciona tu camión.</li>
        <li>Para seguimiento en segundo plano, pulsa <strong>ACTIVAR GPS DE JORNADA</strong> y permite ubicación precisa y notificaciones.</li>
      </ol>
      <p className="ayuda">Para actualizar, vuelve aquí e instala la nueva versión sobre la anterior. No hace falta desinstalar. Si Android indica que la firma es distinta, conserva tus datos y consulta al administrador.</p>
    </> : estado.tipo === 'preparando' ? <Aviso>La descarga Android se está preparando. Mientras tanto puedes seguir usando Reparto desde la web.</Aviso> : <>
      <Aviso>No pudimos comprobar la descarga. Tu aplicación web sigue disponible.</Aviso>
      <Boton variante="secundario" onClick={() => { setEstado(undefined); setIntento(intento + 1); }}>REINTENTAR DESCARGA</Boton>
    </>}
    <p className="ayuda">La instalación requiere tu confirmación. Android puede mostrar avisos de seguridad al instalar fuera de Google Play.</p>
    <h2>¿Usas iPhone o prefieres la web?</h2>
    <p>Puedes usar Reparto sin instalar este APK. En iPhone, abre la web en Safari y elige Compartir → Añadir a pantalla de inicio. El GPS web funciona con la aplicación visible; no ofrece seguimiento continuo en segundo plano.</p>
    <Link className="big-button big-button--secundario" to="/">SEGUIR EN REPARTO WEB</Link>
  </Pagina></main>;
};
