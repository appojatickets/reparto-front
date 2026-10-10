import { useCallback, useState } from 'react';
import { Link } from 'react-router';
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

/** Inicio del chofer: primero elige su camión del día; después carga facturas y ve su ruta (ADR 0012). */
export const InicioChofer = () => {
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
      <ul className="menu">
        <li><Link to="/cargar">CARGAR ENTREGAS</Link></li>
        <li><Link to="/mi-ruta">MI RUTA</Link></li>
      </ul>
      <div className="fila-botones">
        <Boton variante="secundario" onClick={() => { setCambiando(true); }}>CAMBIAR DE CAMIÓN</Boton>
        <Boton variante="secundario" onClick={() => void terminar()}>TERMINAR MI DÍA</Boton>
      </div>
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </section>
  );
};
