import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useUsuario } from '../sesion';
import { fechaLarga } from '../../../../domain/fechas';
import { nombreDeCamion } from '../../../../domain/patente';
import { mensajeDeError } from '../../../../application/mensajes';
import type { Camion } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { AsignacionDelDia } from '../componentes/AsignacionDelDia';
import { Aviso, Boton, Cargando, ErrorCarga } from '../componentes/ui';

const ElegirCamion = ({ alElegir }: { readonly alElegir: () => void }) => {
  const { api } = useCasos();
  const usuario = useUsuario();
  const [ultimo] = useState(() => { try { return localStorage.getItem(`reparto:ultimo-camion:${usuario.id}`); } catch { return null; } });
  const cargar = useCallback(() => api.listarCamiones(), [api]);
  const { estado, recargar } = useCarga(cargar);
  const [error, setError] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);

  const elegir = async (c: Camion): Promise<void> => {
    setOcupado(true);
    setError(undefined);
    const r = await api.iniciarJornada(c.id);
    setOcupado(false);
    if (r.ok) {
      try { localStorage.setItem(`reparto:ultimo-camion:${usuario.id}`, c.id); } catch { /* La jornada sigue guardada en el servidor. */ }
      alElegir();
    }
    else setError(mensajeDeError(r.error));
  };

  const recordado = estado.tipo === 'ok' ? estado.datos.find((c) => c.id === ultimo && c.activo) : undefined;
  const boton = (c: Camion) => <button type="button" className="big-button big-button--primario" disabled={ocupado} onClick={() => void elegir(c)}>{nombreDeCamion(c)}</button>;
  return (
    <section className="pagina" aria-label="Elegir camión">
      <h2>¿Qué camión manejas hoy?</h2>
      {estado.tipo === 'cargando' ? <Cargando /> : null}
      {estado.tipo === 'error' ? <ErrorCarga error={estado.error} alReintentar={recargar} /> : null}
      {estado.tipo === 'ok' && estado.datos.length === 0 ? <Aviso>No hay camiones cargados. Avisa en la oficina.</Aviso> : null}
      {recordado ? <div className="tarjeta"><p>Último camión utilizado. ¿Lo usas hoy?</p>{boton(recordado)}</div> : null}
      {estado.tipo === 'ok' ? recordado ? <details className="opciones-simples"><summary>ELEGIR OTRO CAMIÓN</summary><ul className="menu">{estado.datos.filter((c) => c.id !== recordado.id && c.activo).map((c) => <li key={c.id}>{boton(c)}</li>)}</ul></details> : <ul className="menu">{estado.datos.filter((c) => c.activo).map((c) => <li key={c.id}>{boton(c)}</li>)}</ul> : null}
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </section>
  );
};

const ResumenDelDia = ({ camionId, fecha }: { readonly camionId: string; readonly fecha: string }) => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.verRuta(camionId, fecha), [api, camionId, fecha]);
  const { estado } = useCarga(cargar);
  if (estado.tipo !== 'ok') return null;
  const v = estado.datos;
  const pendientes = new Set([...v.paradas, ...v.nuevas, ...v.sinPin, ...v.noAtendidas].map((p) => p.facturaId)).size;
  return <p>{pendientes} pendientes · {v.hechas.filter((h) => h.estado === 'entregada').length} entregadas</p>;
};

/** Inicio del chofer: primero elige su camión del día; después carga facturas y ve su ruta (ADR 0012). */
export const InicioChofer = () => {
  const usuario = useUsuario();
  const { api } = useCasos();
  const cargar = useCallback(() => api.miJornada(), [api]);
  const { estado, recargar, refrescar } = useCarga(cargar);
  const [cambiando, setCambiando] = useState(false);
  const camionActual = estado.tipo === 'ok' ? estado.datos?.camion.id : undefined;
  useEffect(() => {
    if (camionActual) { try { localStorage.setItem(`reparto:ultimo-camion:${usuario.id}`, camionActual); } catch { /* Sin almacenamiento local. */ } }
  }, [camionActual, usuario.id]);

  if (estado.tipo === 'cargando') return <Cargando />;
  if (estado.tipo === 'error') return <ErrorCarga error={estado.error} alReintentar={recargar} />;
  const jornada = estado.datos;

  if (!jornada || cambiando) {
    return <ElegirCamion alElegir={() => { setCambiando(false); refrescar(); }} />;
  }

  return (
    <section className="pagina" aria-label="Mi jornada">
      <div className="tarjeta">
        <span>Hoy, {fechaLarga(jornada.fecha)}</span>
        <strong>Camión {nombreDeCamion(jornada.camion)}</strong>
        {jornada.asignacion ? <AsignacionDelDia a={jornada.asignacion} conCamion={false} /> : null}
      </div>
      <ResumenDelDia camionId={jornada.camion.id} fecha={jornada.fecha} />
      <ul className="menu">
        <li><Link to="/mi-ruta">CONTINUAR REPARTO</Link></li>
        <li><Link to="/cargar">AGREGAR ENTREGAS</Link></li>
      </ul>
      <details className="opciones-simples"><summary>CAMBIAR CAMIÓN O TERMINAR EL DÍA</summary>
      <div className="fila-botones">
        <Boton variante="secundario" onClick={() => { setCambiando(true); }}>CAMBIAR DE CAMIÓN</Boton>
        <Link className="big-button big-button--secundario" to="/mi-ruta">TERMINAR MI DÍA</Link>
      </div>
      </details>
    </section>
  );
};
