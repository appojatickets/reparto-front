import { useEffect, useRef, useState } from 'react';
import type { EstadoPermisos } from '../../../../application/ports/permisos';
import { useCasos } from '../contexto';
import { Aviso, Boton } from './ui';

/** El teléfono conserva la autorización; la marca local recuerda que ya se preguntó, nunca simula un permiso. */
export const PermisosAlAbrir = ({ usuarioId = 'actual' }: { readonly usuarioId?: string }) => {
  const { permisos, seguimientoNativo } = useCasos();
  const [estado, setEstado] = useState<EstadoPermisos | undefined>();
  const [ocupado, setOcupado] = useState(false);
  const solicitando = useRef(false);
  const clave = `reparto:permisos-preguntados:${usuarioId}`;
  useEffect(() => {
    let vivo = true;
    const consultar = async (): Promise<void> => {
      try { const e = await permisos.estado(); if (vivo && !solicitando.current) setEstado(e); } catch { /* Los botones de entrega y dictado siguen disponibles. */ }
    };
    const iniciar = async (): Promise<void> => {
      let preguntado = false;
      try { preguntado = localStorage.getItem(clave) === 'si'; } catch { /* Se consulta al sistema. */ }
      if (preguntado) { await consultar(); return; }
      solicitando.current = true;
      setOcupado(true);
      try {
        try { localStorage.setItem(clave, 'si'); } catch { /* Sin persistencia. */ }
        const e = await permisos.pedir();
        if (vivo) setEstado(e);
      } finally { solicitando.current = false; if (vivo) setOcupado(false); }
    };
    void iniciar().catch(() => undefined);
    const alVolver = (): void => { if (document.visibilityState === 'visible') void consultar(); };
    const intervalo = window.setInterval(alVolver, 15000);
    window.addEventListener('focus', alVolver);
    document.addEventListener('visibilitychange', alVolver);
    return () => { vivo = false; window.clearInterval(intervalo); window.removeEventListener('focus', alVolver); document.removeEventListener('visibilitychange', alVolver); };
  }, [permisos, clave]);
  const pedir = async (): Promise<void> => {
    if (solicitando.current) return;
    solicitando.current = true;
    setOcupado(true);
    try { setEstado(await permisos.pedir()); } finally { solicitando.current = false; setOcupado(false); }
  };
  if (!estado || (estado.ubicacion === 'concedido' && estado.microfono === 'concedido')) return null;
  const bloqueado = estado.ubicacion === 'denegado' || estado.microfono === 'denegado';
  return <section className="tarjeta" aria-label="Permisos del teléfono">
    <Aviso tipo={bloqueado ? 'error' : 'info'}>{estado.ubicacion !== 'concedido' ? 'Ubicación sin activar. ' : ''}{estado.microfono !== 'concedido' ? 'Micrófono sin activar: puedes seguir escribiendo.' : ''}</Aviso>
    <details className="opciones-simples"><summary>ACTIVAR MICRÓFONO Y UBICACIÓN</summary>
      <p>Estos permisos se conservan según los ajustes del teléfono. El micrófono se usa al dictar.</p>
      {seguimientoNativo ? <p>Para seguir la ruta con Waze o la pantalla bloqueada, pulsa ACTIVAR GPS DE JORNADA después de elegir camión.</p> : <p>En la web, el seguimiento funciona mientras Reparto permanece abierto. Para GPS en segundo plano usa la app Android.</p>}
      {bloqueado ? <p>{seguimientoNativo ? 'Abre Ajustes del teléfono → Aplicaciones → Reparto → Permisos.' : 'Abre los permisos de este sitio en el navegador y permite Ubicación y Micrófono.'}</p> : null}
      <Boton variante="secundario" disabled={ocupado} onClick={() => void pedir().catch(() => undefined)}>{ocupado ? 'SOLICITANDO PERMISOS…' : 'PERMITIR MICRÓFONO Y UBICACIÓN'}</Boton>
    </details>
  </section>;
};
