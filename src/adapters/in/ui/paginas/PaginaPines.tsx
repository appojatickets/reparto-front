import { useCallback, useState } from 'react';
import { mensajeDeError } from '../../../../application/mensajes';
import type { PropuestaPin } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { Aviso, Boton, Cargando, ErrorCarga, Insignia, Pagina } from '../componentes/ui';

const Propuestas = ({ estado }: { readonly estado: 'pendiente' | 'sin_local' }) => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.listarPropuestas(estado), [api, estado]);
  const { estado: carga, recargar } = useCarga(cargar);
  const [error, setError] = useState<string | undefined>();

  const resolver = async (id: string, accion: 'aceptar' | 'rechazar'): Promise<void> => {
    setError(undefined);
    const r = await api.resolverPropuesta(id, accion);
    if (r.ok) recargar();
    else setError(mensajeDeError(r.error));
  };

  if (carga.tipo === 'cargando') return <Cargando />;
  if (carga.tipo === 'error') return <ErrorCarga error={carga.error} alReintentar={recargar} />;
  if (carga.datos.length === 0) return <Aviso>No hay propuestas {estado === 'pendiente' ? 'pendientes' : 'sin local'}.</Aviso>;
  return (
    <>
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      <ul className="tarjetas">
        {carga.datos.map((p: PropuestaPin) => (
          <li key={p.id} className="tarjeta">
            <strong>{p.razonSocial ?? 'Dirección sin cliente'}</strong>
            <span>{p.direccion}{p.comuna ? `, ${p.comuna}` : ''}</span>
            <span>Pin propuesto: {p.lat}, {p.lng}</span>
            {p.distanciaActualM !== undefined ? <Insignia>{Math.round(p.distanciaActualM)} m del pin actual</Insignia> : null}
            <div className="fila-botones">
              {estado === 'pendiente' ? <Boton onClick={() => void resolver(p.id, 'aceptar')}>ACEPTAR</Boton> : null}
              <Boton variante="secundario" onClick={() => void resolver(p.id, 'rechazar')}>RECHAZAR</Boton>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
};

/** Las propuestas de pin que arma el sistema solo (lo que aprendió de las entregas o el enlace de un vendedor sobre un pin ya confirmado). Nada cambia hasta que se acepta. */
export const PaginaPines = () => {
  const [vista, setVista] = useState<'pendiente' | 'sin_local'>('pendiente');
  return (
    <Pagina titulo="Propuestas de pin">
      <p>Aquí llegan los pines que sugiere el sistema cuando un local ya tiene un pin confirmado. Nada cambia solo: acepta o rechaza cada uno.</p>
      <div className="fila-botones" role="group" aria-label="Estado">
        <Boton variante={vista === 'pendiente' ? 'primario' : 'secundario'} aria-pressed={vista === 'pendiente'} onClick={() => { setVista('pendiente'); }}>PENDIENTES</Boton>
        <Boton variante={vista === 'sin_local' ? 'primario' : 'secundario'} aria-pressed={vista === 'sin_local'} onClick={() => { setVista('sin_local'); }}>SIN LOCAL</Boton>
      </div>
      <Propuestas key={vista} estado={vista} />
    </Pagina>
  );
};
