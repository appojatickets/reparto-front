import { useCallback, useRef, useState, type ChangeEvent } from 'react';
import { mensajeDeError } from '../../../../application/mensajes';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { Aviso, Boton, Cargando } from './ui';

const Imagen = ({ localId, cliente, version }: { readonly localId: string; readonly cliente: string; readonly version: number }) => {
  const { api } = useCasos();
  // `version` pide una URL firmada nueva después de subir una foto.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- la URL se vuelve a pedir solo cuando cambia la versión
  const cargar = useCallback(() => api.urlFoto(localId), [api, localId, version]);
  const { estado } = useCarga(cargar);
  if (estado.tipo === 'cargando') return <Cargando texto="Cargando foto…" />;
  if (estado.tipo === 'error') return <Aviso tipo="error">{mensajeDeError(estado.error, 'No se pudo cargar la foto.')}</Aviso>;
  return <img className="foto foto-fachada" src={estado.datos.url} alt={`Fachada de ${cliente}`} loading="lazy" />;
};

/**
 * La foto de la fachada que subió alguien del equipo, para reconocer el local al llegar. Si no hay, un solo botón: al llegar el chofer toma
 * la foto (sin personas) y queda para todos y para los días siguientes. No se usan imágenes de Google: solo fotos propias.
 */
export const FotoFachada = ({ localId, cliente, tieneFoto }: { readonly localId: string; readonly cliente: string; readonly tieneFoto: boolean }) => {
  const { subirFotoLocal } = useCasos();
  const [hay, setHay] = useState(tieneFoto);
  const [version, setVersion] = useState(0);
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | undefined>();
  const entrada = useRef<HTMLInputElement>(null);

  const subir = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setSubiendo(true);
    setMensaje(undefined);
    const r = await subirFotoLocal(localId, archivo);
    setSubiendo(false);
    if (r.ok) {
      setHay(true);
      setVersion((v) => v + 1);
      setMensaje({ tipo: 'exito', texto: 'Foto guardada. Ahora la ven todos.' });
    } else setMensaje({ tipo: 'error', texto: r.error });
  };

  return (
    <div className="pagina" aria-label={`Foto de ${cliente}`}>
      {hay ? <Imagen localId={localId} cliente={cliente} version={version} /> : <p className="ayuda">Todavía no hay foto de esta fachada. Al llegar, toma una (sin personas): ayuda a todos.</p>}
      <input ref={entrada} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void subir(e)} aria-label={`Foto de la fachada de ${cliente}`} />
      <Boton variante={hay ? 'secundario' : 'primario'} disabled={subiendo} onClick={() => { entrada.current?.click(); }}>
        {subiendo ? 'SUBIENDO FOTO…' : hay ? 'CAMBIAR LA FOTO' : 'TOMAR FOTO DE LA FACHADA'}
      </Boton>
      {mensaje ? <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso> : null}
    </div>
  );
};
