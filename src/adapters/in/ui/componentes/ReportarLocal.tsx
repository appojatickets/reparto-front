import { useState } from 'react';
import { mensajeDeError } from '../../../../application/mensajes';
import type { TipoReporteLocal } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { Aviso, Boton, Campo } from './ui';

const TEXTOS: Readonly<Record<TipoReporteLocal, { readonly boton: string; readonly pregunta: string; readonly gracias: string }>> = {
  nombre: { boton: 'REPORTAR EL NOMBRE', pregunta: 'Cómo debería llamarse (opcional)', gracias: 'Gracias. El administrador va a revisar el nombre.' },
  ubicacion: { boton: 'REPORTAR LA UBICACIÓN', pregunta: 'Qué tiene mal el pin, o dónde queda en realidad (opcional)', gracias: 'Gracias. El administrador va a revisar la ubicación; el pin quedó «por verificar».' },
};

const Uno = ({ localId, cliente, tipo }: { readonly localId: string; readonly cliente: string; readonly tipo: TipoReporteLocal }) => {
  const { api } = useCasos();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [enviado, setEnviado] = useState(false);
  const t = TEXTOS[tipo];

  const enviar = async (): Promise<void> => {
    setOcupado(true);
    setError(undefined);
    const limpio = texto.trim();
    const r = await api.reportarLocal(localId, { tipo, ...(limpio !== '' ? (tipo === 'nombre' ? { sugerido: limpio } : { detalle: limpio }) : {}) });
    setOcupado(false);
    if (r.ok) {
      setEnviado(true);
      setAbierto(false);
    } else setError(mensajeDeError(r.error));
  };

  if (enviado) return <Aviso tipo="exito">{t.gracias}</Aviso>;
  if (!abierto) return <Boton variante="secundario" aria-label={`${t.boton} DE ${cliente}`} onClick={() => { setAbierto(true); }}>{t.boton}</Boton>;
  return (
    <div className="tarjeta" role="group" aria-label={`${t.boton} de ${cliente}`}>
      <Campo etiqueta={t.pregunta} value={texto} maxLength={tipo === 'nombre' ? 120 : 200} onChange={(e) => { setTexto(e.target.value); }} autoComplete="off" />
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      <div className="fila-botones">
        <Boton disabled={ocupado} onClick={() => void enviar()}>{ocupado ? 'ENVIANDO…' : 'ENVIAR REPORTE'}</Boton>
        <Boton variante="secundario" onClick={() => { setAbierto(false); setError(undefined); }}>CANCELAR</Boton>
      </div>
    </div>
  );
};

/** «Algo está mal»: el nombre o la ubicación del local (la foto se reporta aparte). El administrador lo revisa en REPORTES. */
export const ReportarLocal = ({ localId, cliente, conPin }: { readonly localId: string; readonly cliente: string; readonly conPin: boolean }) => (
  <div className="fila-botones" role="group" aria-label={`Reportar un error de ${cliente}`}>
    <Uno localId={localId} cliente={cliente} tipo="nombre" />
    {conPin ? <Uno localId={localId} cliente={cliente} tipo="ubicacion" /> : null}
  </div>
);
