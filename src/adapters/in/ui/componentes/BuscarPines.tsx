import { useCallback, useEffect, useState } from 'react';
import { mensajeDeError } from '../../../../application/mensajes';
import type { EstadoBusquedaPines } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { Aviso, Boton } from './ui';

const CADA_MS = 5000;

/**
 * El sistema busca solo la dirección de cada cliente nuevo; este botón pide buscar de una vez todos los que siguen sin pin (por ejemplo
 * los que se importaron desde la lista de Google Maps). Corre en el servidor, de a uno por segundo, y se puede seguir el avance.
 */
export const BuscarPines = () => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.estadoBusquedaPines(), [api]);
  const { estado, refrescar } = useCarga(cargar);
  const [error, setError] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);
  const [encolados, setEncolados] = useState<number | undefined>();
  const datos: EstadoBusquedaPines | undefined = estado.tipo === 'ok' ? estado.datos : undefined;
  const corriendo = datos?.enMarcha === true;

  useEffect(() => {
    if (!corriendo) return undefined;
    const t = setInterval(refrescar, CADA_MS);
    return () => { clearInterval(t); };
  }, [corriendo, refrescar]);

  const pedir = async (): Promise<void> => {
    setOcupado(true);
    setError(undefined);
    const r = await api.buscarPinesPendientes();
    setOcupado(false);
    if (r.ok) {
      setEncolados(r.value.encolados);
      refrescar();
    } else setError(mensajeDeError(r.error));
  };

  if (!datos) return null;
  return (
    <section className="pagina" aria-label="Buscar pines por dirección">
      <h2>Pines por dirección</h2>
      <p>Hay <strong>{datos.sinPin}</strong> locales sin pin. El sistema los busca en el mapa por su dirección y comuna, de a uno por segundo. Los que no encuentra se afinan con el GPS de la primera entrega o con el enlace del vendedor.</p>
      {corriendo ? <Aviso>Buscando… quedan {datos.enCola} en la cola. Puedes seguir usando la app.</Aviso> : null}
      {!corriendo && encolados !== undefined ? <Aviso tipo="exito">Listo: se buscaron {encolados} direcciones. Quedan {datos.sinPin} sin pin (las que el mapa no encontró).</Aviso> : null}
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      <Boton disabled={ocupado || corriendo || datos.sinPin === 0} onClick={() => void pedir()}>{corriendo ? 'BUSCANDO…' : 'BUSCAR LOS PINES POR DIRECCIÓN'}</Boton>
    </section>
  );
};
