import { useCallback } from 'react';
import { mensajeDeError } from '../../../../application/mensajes';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { Aviso, Cargando } from './ui';

/** La foto de la fachada de un local, pedida con su URL firmada (dura pocos minutos). `version` pide una nueva. */
export const ImagenFoto = ({ localId, cliente, version = 0 }: { readonly localId: string; readonly cliente: string; readonly version?: number }) => {
  const { api } = useCasos();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- la URL se vuelve a pedir solo cuando cambia la versión
  const cargar = useCallback(() => api.urlFoto(localId), [api, localId, version]);
  const { estado } = useCarga(cargar);
  if (estado.tipo === 'cargando') return <Cargando texto="Cargando foto…" />;
  if (estado.tipo === 'error') return <Aviso tipo="error">{mensajeDeError(estado.error, 'No se pudo cargar la foto.')}</Aviso>;
  return <img className="foto foto-fachada" src={estado.datos.url} alt={`Fachada de ${cliente}`} loading="lazy" />;
};
