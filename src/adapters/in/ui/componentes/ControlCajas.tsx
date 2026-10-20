import { useEffect, useState } from 'react';
import type { CajasActuales } from '../../../../application/modelos';
import { mensajeDeError } from '../../../../application/mensajes';
import { useCasos } from '../contexto';
import { Aviso, Boton, Campo } from './ui';
export const EVENTO_CAJAS = 'reparto:cajas-actualizadas';
const numero = (s: string): number => s.trim() === '' ? Number.NaN : Number(s.replace(',', '.'));
const cantidadValida = (n: number): boolean => Number.isFinite(n) && n >= 0 && n <= 1_000_000 && Math.abs(n * 100 - Math.round(n * 100)) < 0.000001;
const pesos = (n: number): string => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 2 }).format(n);

/** Dos datos en toda la jornada: carga al empezar y rebajes totales al terminar. */
export const ControlCajas = ({ cierre = false, alCerrar }: { readonly cierre?: boolean; readonly alCerrar?: () => Promise<void> | void }) => {
  const { api } = useCasos();
  const [actual, setActual] = useState<CajasActuales | null>();
  const [cargadas, setCargadas] = useState('');
  const [rebajes, setRebajes] = useState('0');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    let vivo = true;
    const cargar = (): void => { void api.obtenerCajas().then(r => {
      if (!vivo) return;
      if (!r.ok) { setError(mensajeDeError(r.error)); return; }
      const c = r.value;
      setError('');
      setActual(c);
      setCargadas(c ? String(c.registrada ? c.cargadasUsuario : c.cargadasCamion) : '');
      setRebajes(c ? String(c.porCerrado + c.rebajes) : '0');
    }).catch(() => { if (vivo) setError('No se pudo consultar la carga. Vuelve a abrir esta pantalla para reintentar.'); }); };
    cargar(); window.addEventListener(EVENTO_CAJAS, cargar);
    return () => { vivo = false; window.removeEventListener(EVENTO_CAJAS, cargar); };
  }, [api]);
  const carga = numero(cargadas);
  const rebaje = rebajes.trim() === '' ? 0 : numero(rebajes);
  const valido = cantidadValida(carga) && cantidadValida(rebaje) && rebaje <= carga;
  const entregadas = valido ? Math.round((carga - rebaje) * 100) / 100 : undefined;
  const guardar = async (): Promise<void> => {
    if (!cantidadValida(carga)) { setError('Escribe las cajas cargadas: cero o más, con hasta dos decimales.'); return; }
    setOcupado(true); setError('');
    try {
      const r = await api.guardarCajas({ cargadasCamion: carga, cargadasUsuario: carga, revision: actual?.revision ?? 0 });
      if (!r.ok) setError(mensajeDeError(r.error));
      else { setActual(r.value); window.dispatchEvent(new Event(EVENTO_CAJAS)); }
    } catch { setError('No se guardó la carga. Comprueba la conexión y reintenta.'); }
    finally { setOcupado(false); }
  };
  const cerrar = async (): Promise<void> => {
    if (!actual?.registrada && cargadas.trim() === '' && rebaje === 0) { await omitir(); return; }
    if (!valido) { setError('Los rebajes deben estar entre cero y las cajas cargadas, con hasta dos decimales.'); return; }
    setOcupado(true); setError('');
    try {
      if (!actual?.registrada) {
        const guardada = await api.guardarCajas({ cargadasCamion: carga, cargadasUsuario: carga, revision: actual?.revision ?? 0 });
        if (!guardada.ok) { setError(mensajeDeError(guardada.error)); return; }
        setActual(guardada.value);
      }
      // Conserva los cierres antiguos sin reclasificar sus descuentos.
      const porCerrado = actual?.cerrada ? actual.porCerrado : 0;
      const r = await api.cerrarCajas({ porCerrado, rebajes: Math.round((rebaje - porCerrado) * 100) / 100, rebajesCamion: rebaje });
      if (!r.ok) setError(mensajeDeError(r.error));
      else { window.dispatchEvent(new Event(EVENTO_CAJAS)); await alCerrar?.(); }
    } catch { setError('No se confirmó el cierre. Comprueba la conexión y reintenta.'); }
    finally { setOcupado(false); }
  };
  const omitir = async (): Promise<void> => {
    setOcupado(true); setError('');
    try { await alCerrar?.(); }
    catch { setError('No se terminó la ruta. Comprueba la conexión y reintenta.'); }
    finally { setOcupado(false); }
  };
  const lista = actual !== undefined;
  return <section className="tarjeta control-cajas" aria-label={cierre ? 'Rebajes al terminar' : 'Cajas de mi jornada'}>
    <div><span className="ceja">MI JORNADA</span><h3>{cierre ? 'Cierra tu día' : 'Cajas cargadas'}</h3></div>
    {!lista && !error ? <p role="status">Consultando cajas…</p> : null}
    {cierre && actual?.registrada ? <p>Cajas cargadas: <strong>{actual.cargadasUsuario}</strong></p> :
      <Campo etiqueta="Cajas cargadas" ayuda="Opcional. El total que cargas para repartir. Admite 0,5 o 3,5." inputMode="decimal" value={cargadas} onChange={e => { setCargadas(e.target.value); }} disabled={!lista || ocupado || actual?.cerrada} />}
    {cierre ? <Campo etiqueta="Rebajes" ayuda="Total de cajas no entregadas, incluidos los locales cerrados. Si entregaste todo, deja 0 o vacío." inputMode="decimal" value={rebajes} onChange={e => { setRebajes(e.target.value); }} disabled={!lista || ocupado || actual?.cerrada} /> : null}
    {entregadas !== undefined ? <div className="resumen-cajas" aria-live="polite" aria-atomic="true">
      <div><span>Entrega efectiva{!cierre && !actual?.cerrada ? ' estimada' : ''}</span><strong>{entregadas} <small>cajas</small></strong></div>
      <div><span>Ganancia del día{!cierre && !actual?.cerrada ? ' estimada' : ''}</span><strong>{pesos(entregadas * 15)}</strong><small>$15 por caja entregada</small></div>
    </div> : null}
    {actual?.cerrada ? <p role="status">Cierre confirmado</p> : null}
    {cierre ? <Boton disabled={!lista || ocupado} onClick={() => void cerrar()}>{ocupado ? 'GUARDANDO…' : actual?.cerrada ? 'CONTINUAR CON EL CIERRE' : 'CONFIRMAR REBAJES Y TERMINAR'}</Boton> :
      <Boton disabled={!lista || ocupado || actual?.cerrada === true} onClick={() => void guardar()}>{ocupado ? 'GUARDANDO…' : 'GUARDAR CAJAS CARGADAS'}</Boton>}
    {cierre && !actual?.cerrada ? <><p className="ayuda">Puedes terminar sin registrar cajas. La ganancia quedará sin confirmar.</p><Boton disabled={ocupado} onClick={() => void omitir()}>TERMINAR SIN REGISTRAR CAJAS</Boton></> : null}
    {error ? <Aviso tipo="error">{error}</Aviso> : null}
  </section>;
};
