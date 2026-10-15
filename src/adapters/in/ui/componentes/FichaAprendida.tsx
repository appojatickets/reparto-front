import { useCallback } from 'react';
import { ES_POCA_EVIDENCIA, franjasDeCierre, nombreDelDia, textoDeRango } from '../../../../domain/ficha';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { Aviso } from './ui';

/**
 * Lo que se aprendió de este local con sus entregas (ADR 0049 del back): a qué hora suele entregarse y a qué horas se lo encontró cerrado.
 * Son rangos y probabilidades: los días se parecen pero no son iguales. Con pocas visitas se dice que es solo una pista.
 */
export const FichaAprendida = ({ localId }: { readonly localId: string }) => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.fichaAprendida(localId), [api, localId]);
  const { estado } = useCarga(cargar);
  if (estado.tipo !== 'ok') return null;
  const f = estado.datos;
  if (f.visitas === 0) return null;
  const cierres = franjasDeCierre(f);
  return (
    <section className="pagina" aria-label="Lo que se aprendió de este local">
      <h2>Lo que se aprendió de este local</h2>
      <p>{f.entregas} {f.entregas === 1 ? 'entrega' : 'entregas'} y {f.cerrados} {f.cerrados === 1 ? 'vez' : 'veces'} cerrado en {f.visitas} {f.visitas === 1 ? 'visita' : 'visitas'}.</p>
      {f.horaHabitual ? <p>Suele entregarse <strong>{textoDeRango(f.horaHabitual)}</strong>.</p> : <p>Todavía no hay 3 entregas para saber a qué hora suele entregarse.</p>}
      {f.porDiaSemana.length > 0 ? (
        <ul className="tarjetas">
          {f.porDiaSemana.map((d) => <li key={d.diaSemana} className="tarjeta"><strong>Los {nombreDelDia(d.diaSemana)}</strong> {textoDeRango(d)}</li>)}
        </ul>
      ) : null}
      {cierres.length > 0 ? (
        <>
          <p>Se lo encontró cerrado:</p>
          <ul className="tarjetas">
            {cierres.map((c) => <li key={c.texto} className="tarjeta"><strong>{c.texto}</strong> · {c.cerrados} de {c.visitas} visitas</li>)}
          </ul>
        </>
      ) : null}
      {ES_POCA_EVIDENCIA(f) ? <Aviso>Son pocas visitas: es solo una pista, no una regla.</Aviso> : null}
    </section>
  );
};
