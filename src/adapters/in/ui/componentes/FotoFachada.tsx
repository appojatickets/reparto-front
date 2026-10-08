import { useRef, useState, type ChangeEvent } from 'react';
import { useCasos } from '../contexto';
import { ImagenFoto } from './ImagenFoto';
import { ReportarFoto } from './ReportarFoto';
import { ReportarLocal } from './ReportarLocal';
import { Aviso, Boton } from './ui';

/**
 * La foto de la fachada que subió alguien del equipo, para reconocer el local al llegar. Si no hay, un solo botón: al llegar el chofer toma
 * la foto (sin personas) y queda para todos y para los días siguientes. No se usan imágenes de Google: solo fotos propias.
 */
export const FotoFachada = ({ localId, cliente, tieneFoto, conPin = false }: { readonly localId: string; readonly cliente: string; readonly tieneFoto: boolean; readonly conPin?: boolean }) => {
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
      {hay ? <ImagenFoto localId={localId} cliente={cliente} version={version} /> : <p className="ayuda">Todavía no hay foto de esta fachada. Al llegar, toma una (sin personas): ayuda a todos.</p>}
      <input ref={entrada} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void subir(e)} aria-label={`Foto de la fachada de ${cliente}`} />
      <Boton variante={hay ? 'secundario' : 'primario'} disabled={subiendo} onClick={() => { entrada.current?.click(); }}>
        {subiendo ? 'SUBIENDO FOTO…' : hay ? 'CAMBIAR LA FOTO' : 'TOMAR FOTO DE LA FACHADA'}
      </Boton>
      {hay ? <ReportarFoto localId={localId} cliente={cliente} /> : null}
      <ReportarLocal localId={localId} cliente={cliente} conPin={conPin} />
      {mensaje ? <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso> : null}
    </div>
  );
};
