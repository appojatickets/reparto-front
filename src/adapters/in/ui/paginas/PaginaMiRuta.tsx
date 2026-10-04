import { useCallback } from 'react';
import { Link } from 'react-router';
import { formatearPatente } from '../../../../domain/patente';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { Aviso, Cargando, ErrorCarga, Pagina } from '../componentes/ui';
import { RutaDelCamion } from './PaginaRutas';

/** La ruta de hoy del camión que el chofer eligió. */
export const PaginaMiRuta = () => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.miJornada(), [api]);
  const { estado, recargar } = useCarga(cargar);
  const j = estado.tipo === 'ok' ? estado.datos : null;
  return (
    <Pagina titulo="Mi ruta de hoy">
      {estado.tipo === 'cargando' ? <Cargando /> : null}
      {estado.tipo === 'error' ? <ErrorCarga error={estado.error} alReintentar={recargar} /> : null}
      {estado.tipo === 'ok' && !j ? <Aviso tipo="error">Primero elige el camión que manejas hoy. <Link to="/">Ir al inicio</Link></Aviso> : null}
      {j ? (
        <>
          <p>Camión <strong>{j.camion.alias ? `${j.camion.alias} · ` : ''}{formatearPatente(j.camion.patente)}</strong></p>
          <RutaDelCamion camionId={j.camion.id} fecha={j.fecha} />
        </>
      ) : null}
    </Pagina>
  );
};
