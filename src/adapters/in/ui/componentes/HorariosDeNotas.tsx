import { useState } from 'react';
import { resumenDia } from '../../../../domain/horario-semanal';
import { mensajeDeError } from '../../../../application/mensajes';
import { revisarNotas, type AvanceHorarios, type RevisionDeNotas, type ResultadoHorarios } from '../../../../application/use-cases/horarios-de-notas';
import { useCasos } from '../contexto';
import { Aviso, Boton } from './ui';

const MUESTRA = 6;
const MAX_NO_ENTENDIDAS = 15;

/**
 * Convierte en horario de atención lo que alguien escribió en las notas («De 7 AM a 10 pm», «Cierra de 2 a 4 pm»…). Primero se revisa lo
 * que se entendió, y solo al aplicar se guarda; nunca pisa un horario que ya estaba cargado. Es lo que la ruta usa para no llegar con el local cerrado.
 */
export const HorariosDeNotas = () => {
  const { api, aplicarHorariosDeNotas } = useCasos();
  const [revision, setRevision] = useState<RevisionDeNotas | undefined>();
  const [ocupado, setOcupado] = useState(false);
  const [avance, setAvance] = useState<AvanceHorarios | undefined>();
  const [resultado, setResultado] = useState<ResultadoHorarios | undefined>();
  const [error, setError] = useState<string | undefined>();

  const revisar = async (): Promise<void> => {
    setOcupado(true);
    setError(undefined);
    setResultado(undefined);
    const r = await api.exportarLocales({});
    setOcupado(false);
    if (!r.ok) {
      setError(mensajeDeError(r.error));
      return;
    }
    setRevision(revisarNotas(r.value.filas.flatMap((f) => (f.nota !== undefined ? [{ localId: f.localId, razonSocial: f.razonSocial, nota: f.nota }] : []))));
  };

  const aplicar = async (): Promise<void> => {
    if (!revision) return;
    setOcupado(true);
    setAvance({ procesados: 0, total: revision.entendidos.length });
    setResultado(await aplicarHorariosDeNotas(revision.entendidos, setAvance));
    setAvance(undefined);
    setOcupado(false);
  };

  return (
    <section className="pagina" aria-label="Horarios desde las notas">
      <h2>Horarios desde las notas</h2>
      <p>Si en la nota de un cliente dice, por ejemplo, «De 7 AM a 10 pm» o «Cierra de 2 a 4 pm», se guarda como su horario de atención (lunes a sábado) y la ruta evita llegar con el local cerrado. No pisa los horarios que ya cargaste.</p>
      <Boton variante="secundario" disabled={ocupado} onClick={() => void revisar()}>{ocupado && !avance ? 'REVISANDO…' : 'REVISAR LAS NOTAS CON HORARIOS'}</Boton>
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      {revision ? (
        <>
          <Aviso tipo={revision.entendidos.length > 0 ? 'exito' : 'info'}>
            {revision.conNota} clientes con nota · horario entendido: {revision.entendidos.length} · parecen horario y no los entendí: {revision.sinEntender.length}.
          </Aviso>
          {revision.entendidos.length > 0 ? (
            <ul className="tarjetas" aria-label="Así quedarían">
              {revision.entendidos.slice(0, MUESTRA).map((h) => (
                <li key={h.localId} className="tarjeta">
                  <strong>{h.razonSocial}</strong>
                  <span>«{h.nota}»</span>
                  <span>Quedaría: {resumenDia({ estado: 'abierto', tramos: h.tramos })} (lunes a sábado)</span>
                </li>
              ))}
            </ul>
          ) : null}
          {revision.entendidos.length > MUESTRA ? <p>… y {revision.entendidos.length - MUESTRA} más.</p> : null}
          {revision.sinEntender.length > 0 ? (
            <>
              <Aviso>Estas notas parecen horario pero no quedaron claras: no se tocan (puedes cargar su horario a mano en la ficha del local).</Aviso>
              <ul>{revision.sinEntender.slice(0, MAX_NO_ENTENDIDAS).map((l) => <li key={l.localId}>{l.razonSocial}: «{l.nota}»</li>)}</ul>
            </>
          ) : null}
          {revision.entendidos.length > 0 ? (
            <Boton disabled={ocupado || resultado !== undefined} onClick={() => void aplicar()}>
              {ocupado && avance ? `GUARDANDO… ${avance.procesados} DE ${avance.total}` : `APLICAR ${revision.entendidos.length} HORARIOS`}
            </Boton>
          ) : null}
        </>
      ) : null}
      {resultado ? (
        <section aria-label="Resultado de los horarios" className="pagina">
          <Aviso tipo={resultado.fallos.length === 0 ? 'exito' : 'info'}>
            Listo: {resultado.aplicados} horarios guardados · {resultado.yaTenian} ya tenían uno cargado (no se tocaron).
          </Aviso>
          {resultado.fallos.length > 0 ? (
            <>
              <Aviso tipo="error">No se pudieron guardar {resultado.fallos.length}. Vuelve a tocar REVISAR y APLICAR: lo ya guardado no se repite.</Aviso>
              <ul>{resultado.fallos.slice(0, MAX_NO_ENTENDIDAS).map((f, i) => <li key={`${f.razonSocial}-${String(i)}`}>{f.razonSocial}: {f.mensaje}</li>)}</ul>
            </>
          ) : null}
        </section>
      ) : null}
    </section>
  );
};
