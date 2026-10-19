import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { useUsuario } from '../sesion';
import { puedeEditar } from '../../../../domain/rol';
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
  const cargar = useCallback(() => api.listarCamiones(), [api]);
  const { estado, recargar } = useCarga(cargar);
  const [error, setError] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);

  const elegir = async (c: Camion): Promise<void> => {
    setOcupado(true);
    setError(undefined);
    const r = await api.iniciarJornada(c.id);
    setOcupado(false);
    if (r.ok) alElegir();
    else setError(mensajeDeError(r.error));
  };

  return (
    <section className="pagina" aria-label="Elegir camión">
      <h2>¿Qué camión manejas hoy?</h2>
      {estado.tipo === 'cargando' ? <Cargando /> : null}
      {estado.tipo === 'error' ? <ErrorCarga error={estado.error} alReintentar={recargar} /> : null}
      {estado.tipo === 'ok' && estado.datos.length === 0 ? <Aviso>No hay camiones cargados. Avisa en la oficina.</Aviso> : null}
      {estado.tipo === 'ok' ? (
        <ul className="menu">
          {estado.datos.map((c) => <li key={c.id}><button type="button" className="big-button big-button--primario" disabled={ocupado} onClick={() => void elegir(c)}>{nombreDeCamion(c)}</button></li>)}
        </ul>
      ) : null}
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
  const simple = !puedeEditar(usuario.rol, usuario.editor);
  const { api } = useCasos();
  const cargar = useCallback(() => api.miJornada(), [api]);
  const { estado, recargar, refrescar } = useCarga(cargar);
  const [cambiando, setCambiando] = useState(false);
  const [error, setError] = useState<string | undefined>();

  if (estado.tipo === 'cargando') return <Cargando />;
  if (estado.tipo === 'error') return <ErrorCarga error={estado.error} alReintentar={recargar} />;
  const jornada = estado.datos;

  if (!jornada || cambiando) {
    return <ElegirCamion alElegir={() => { setCambiando(false); refrescar(); }} />;
  }

  const terminar = async (): Promise<void> => {
    const r = await api.terminarJornada();
    if (r.ok) refrescar();
    else setError(mensajeDeError(r.error));
  };

  return (
    <section className="pagina" aria-label="Mi jornada">
      <div className="tarjeta">
        <span>Hoy, {fechaLarga(jornada.fecha)}</span>
        <strong>Camión {nombreDeCamion(jornada.camion)}</strong>
        {jornada.asignacion ? <AsignacionDelDia a={jornada.asignacion} conCamion={false} /> : null}
      </div>
      {simple ? <ResumenDelDia camionId={jornada.camion.id} fecha={jornada.fecha} /> : null}
      <ul className="menu">
        <li><Link to="/mi-ruta">{simple ? "CONTINUAR REPARTO" : "MI RUTA"}</Link></li>
        <li><Link to="/cargar">{simple ? "AGREGAR ENTREGAS" : "CARGAR ENTREGAS"}</Link></li>
      </ul>
      <details className="opciones-simples"><summary>CAMBIAR CAMIÓN O TERMINAR EL DÍA</summary>
      <div className="fila-botones">
        <Boton variante="secundario" onClick={() => { setCambiando(true); }}>CAMBIAR DE CAMIÓN</Boton>
        {simple ? <Link className="big-button big-button--secundario" to="/mi-ruta">TERMINAR MI DÍA</Link> : <Boton variante="secundario" onClick={() => void terminar()}>TERMINAR MI DÍA</Boton>}
      </div>
      </details>
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </section>
  );
};
