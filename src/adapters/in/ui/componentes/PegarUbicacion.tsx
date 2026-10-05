import { useState, type SyntheticEvent } from 'react';
import { mensajeDeError } from '../../../../application/mensajes';
import { useCasos } from '../contexto';
import { Aviso, Boton, Campo } from './ui';

/**
 * Pegar la ubicación que mandó el vendedor (enlace de «Compartir» de Google Maps o Waze, o coordenadas). Cualquiera del equipo
 * puede: lo que se guarda sirve a todos y a los días siguientes (ADR 0018).
 */
export const PegarUbicacion = ({ localId, etiqueta = 'Enlace de la ubicación', alGuardar }: { readonly localId: string; readonly etiqueta?: string; readonly alGuardar?: () => void }) => {
  const { api } = useCasos();
  const [enlace, setEnlace] = useState('');
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error' | 'info'; texto: string } | undefined>();
  const [ocupado, setOcupado] = useState(false);

  const guardar = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (enlace.trim() === '') {
      setMensaje({ tipo: 'error', texto: 'Pega el enlace que mandó el vendedor.' });
      return;
    }
    setOcupado(true);
    setMensaje(undefined);
    const r = await api.fijarPinDesdeEnlace(localId, enlace.trim());
    setOcupado(false);
    if (!r.ok) {
      setMensaje({ tipo: 'error', texto: mensajeDeError(r.error) });
      return;
    }
    setEnlace('');
    setMensaje(r.value.resultado === 'fijado'
      ? { tipo: 'exito', texto: 'Ubicación guardada. Desde ahora sirve para todos.' }
      : { tipo: 'info', texto: 'Este local ya tiene una ubicación confirmada por una persona. La tuya quedó propuesta para que la revisen.' });
    alGuardar?.();
  };

  return (
    <form className="pagina" onSubmit={(e) => void guardar(e)} noValidate>
      <Campo etiqueta={etiqueta} ayuda="En WhatsApp, mantén apretado el mensaje con la ubicación y copia el enlace; pégalo aquí." value={enlace} onChange={(e) => { setEnlace(e.target.value); }} autoComplete="off" inputMode="url" />
      <Boton type="submit" disabled={ocupado}>{ocupado ? 'LEYENDO…' : 'GUARDAR UBICACIÓN DEL VENDEDOR'}</Boton>
      {mensaje ? <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso> : null}
    </form>
  );
};
