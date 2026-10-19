import { useEffect, useState } from 'react';
import type { EstadoSeguimientoNativo } from '../../../../application/ports/seguimiento-nativo';
import { useCasos } from '../contexto';
import { Aviso, Boton } from './ui';

export const SeguimientoAndroid = ({ simple = false }: { readonly simple?: boolean }) => {
  const { seguimientoNativo, api } = useCasos();
  const [estado, setEstado] = useState<EstadoSeguimientoNativo>({ activo: false, pendientes: 0 });
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let vigente = true;
    const consultar = (): void => { void seguimientoNativo?.estado().then((e) => { if (vigente) setEstado(e); }).catch(() => undefined); };
    consultar();
    const id = window.setInterval(consultar, 30000);
    document.addEventListener('visibilitychange', consultar);
    return () => { vigente = false; window.clearInterval(id); document.removeEventListener('visibilitychange', consultar); };
  }, [seguimientoNativo]);
  const cambiar = async (): Promise<void> => {
    if (!seguimientoNativo) return;
    setOcupado(true); setError('');
    try {
      if (estado.activo) await seguimientoNativo.detener();
      else {
        const jornada = await api.miJornada();
        if (!jornada.ok || !jornada.value) { setError('Primero elige el camión de tu jornada y comprueba la conexión.'); return; }
        await seguimientoNativo.iniciar(jornada.value.id);
      }
      setEstado(await seguimientoNativo.estado());
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cambiar el GPS. Revisa los permisos del teléfono.'); }
    finally { setOcupado(false); }
  };
  return <section className="tarjeta" aria-label="GPS de la jornada Android">
    <p role="status">{estado.activo ? (simple ? 'Seguimiento activo' : 'GPS de jornada activado · puede seguir al abrir Waze o bloquear la pantalla.') : 'GPS de jornada detenido.'}</p>
    <details open={!estado.activo || !simple ? true : undefined} className="opciones-simples"><summary>GPS DE JORNADA</summary>
    {estado.activo ? <p className="ayuda">Puntos por enviar: {estado.pendientes}. {estado.ultimoEnvio ? `Último envío: ${new Date(estado.ultimoEnvio).toLocaleTimeString('es-CL')}.` : 'Esperando primera ubicación.'}</p> : <p className="ayuda">Actívalo durante el reparto. Android mostrará una notificación; puedes detenerlo desde ahí. Terminar la jornada o cerrar sesión también lo detiene.</p>}
    <Boton variante="secundario" disabled={ocupado} onClick={() => void cambiar()}>{ocupado ? 'ACTUALIZANDO GPS…' : estado.activo ? 'DETENER GPS DE JORNADA' : 'ACTIVAR GPS DE JORNADA'}</Boton>
    </details>
    {error ? <Aviso tipo="error">{error}</Aviso> : null}
  </section>;
};
