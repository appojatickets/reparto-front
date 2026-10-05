import { useState } from 'react';
import { MOTIVOS_FOTO, type IdMotivoFoto } from '../../../../domain/foto-reporte';
import { mensajeDeError } from '../../../../application/mensajes';
import { useCasos } from '../contexto';
import { Aviso, Boton, Campo, Selector } from './ui';

/** «Esta foto está mal»: cualquiera del equipo la reporta con un motivo y el administrador la revisa (y la elimina si corresponde). */
export const ReportarFoto = ({ localId, cliente }: { readonly localId: string; readonly cliente: string }) => {
  const { api } = useCasos();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState<IdMotivoFoto | ''>('');
  const [detalle, setDetalle] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [enviado, setEnviado] = useState(false);

  const enviar = async (): Promise<void> => {
    if (motivo === '') {
      setError('Elige por qué la reportas.');
      return;
    }
    setOcupado(true);
    setError(undefined);
    const r = await api.reportarFoto(localId, { motivo, ...(detalle.trim() !== '' ? { detalle: detalle.trim() } : {}) });
    setOcupado(false);
    if (r.ok) {
      setEnviado(true);
      setAbierto(false);
    } else setError(mensajeDeError(r.error));
  };

  if (enviado) return <Aviso tipo="exito">Gracias. El administrador va a revisar la foto.</Aviso>;
  if (!abierto) return <Boton variante="secundario" aria-expanded={false} aria-label={`REPORTAR LA FOTO DE ${cliente}`} onClick={() => { setAbierto(true); }}>REPORTAR ESTA FOTO</Boton>;
  return (
    <div className="tarjeta" role="group" aria-label={`Reportar la foto de ${cliente}`}>
      <Selector etiqueta="¿Qué tiene mal la foto?" value={motivo} onChange={(e) => { setMotivo(e.target.value as IdMotivoFoto | ''); }}>
        <option value="">Elige un motivo…</option>
        {MOTIVOS_FOTO.map((m) => <option key={m.id} value={m.id}>{m.texto}</option>)}
      </Selector>
      <Campo etiqueta="Explicación (opcional)" value={detalle} maxLength={200} onChange={(e) => { setDetalle(e.target.value); }} autoComplete="off" />
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      <div className="fila-botones">
        <Boton disabled={ocupado} onClick={() => void enviar()}>{ocupado ? 'ENVIANDO…' : 'ENVIAR REPORTE'}</Boton>
        <Boton variante="secundario" onClick={() => { setAbierto(false); setError(undefined); }}>CANCELAR</Boton>
      </div>
    </div>
  );
};
