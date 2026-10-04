import { useState } from 'react';
import { minutosDeHora } from '../../../../domain/hora';
import {
  abreA, aDiasApi, cierraA, conColacion, desdeApi, DIAS, LUN_A_VIE, marcarCerrado, marcarSinDato, personalizado, resumenDia, validarSemana,
  type Aplicacion, type DiaApi, type DiaSemana, type Semana, type Tramo,
} from '../../../../domain/horario-semanal';
import { mensajeDeError } from '../../../../application/mensajes';
import { useCasos } from '../contexto';
import { Aviso, Boton, Campo } from './ui';

const HORAS_ABRE = [8, 9, 10, 11, 12, 13] as const;
const HORAS_CIERRA = [14, 16, 18, 19, 20, 21] as const;
const COLACIONES: readonly { readonly texto: string; readonly tramo: Tramo }[] = [
  { texto: '13:00 a 14:00', tramo: { desde: 780, hasta: 840 } },
  { texto: '14:00 a 15:00', tramo: { desde: 840, hasta: 900 } },
  { texto: '13:00 a 15:00', tramo: { desde: 780, hasta: 900 } },
];

const Opcion = ({ children, etiqueta, onClick }: { readonly children: string; readonly etiqueta?: string; readonly onClick: () => void }) => (
  <button type="button" className="chip" aria-label={etiqueta} onClick={onClick}>{children}</button>
);

/** Resumen de los 7 días, para quien solo mira. */
export const ResumenHorario = ({ dias }: { readonly dias: readonly DiaApi[] }) => {
  const semana = desdeApi(dias);
  return (
    <ul className="lista-dias" aria-label="Horario de atención">
      {DIAS.map((d) => <li key={d.dia}><strong>{d.largo[0]?.toUpperCase()}{d.largo.slice(1)}:</strong> {resumenDia(semana[d.dia])}</li>)}
    </ul>
  );
};

/**
 * Editor de horario con botones: se eligen los días y luego «cerrado», «abre a las…», «cierra a las…», colación u otro horario.
 * Lo que se guarda es un dato manual: manda sobre lo que el sistema aprenda o suponga.
 */
export const EditorHorario = ({ localId, inicial }: { readonly localId: string; readonly inicial: readonly DiaApi[] }) => {
  const { api } = useCasos();
  const [semana, setSemana] = useState<Semana>(() => desdeApi(inicial));
  const [dias, setDias] = useState<readonly DiaSemana[]>([]);
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'exito' | 'info'; texto: string } | undefined>();
  const [sinGuardar, setSinGuardar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [otro, setOtro] = useState(false);
  const [abre, setAbre] = useState('09:00');
  const [cierra, setCierra] = useState('18:00');
  const [colDesde, setColDesde] = useState('');
  const [colHasta, setColHasta] = useState('');

  const alternarDia = (d: DiaSemana): void => {
    setDias((actual) => (actual.includes(d) ? actual.filter((x) => x !== d) : [...actual, d]));
  };

  const aplicar = (f: (s: Semana, d: readonly DiaSemana[]) => Aplicacion): void => {
    if (dias.length === 0) {
      setAviso({ tipo: 'error', texto: 'Primero elige a qué días se aplica (toca LUN, MAR…).' });
      return;
    }
    const r = f(semana, dias);
    setSemana(r.semana);
    setSinGuardar(true);
    if (r.omitidos.length > 0) {
      const nombres = r.omitidos.map((d) => DIAS.find((x) => x.dia === d)?.largo ?? '').join(', ');
      setAviso({ tipo: 'error', texto: `No se pudo aplicar en: ${nombres}. Ese horario no calza con lo que ya tiene (por ejemplo, la colación queda fuera del horario).` });
    } else setAviso(undefined);
  };

  const aplicarOtro = (): void => {
    const a = minutosDeHora(abre);
    const c = minutosDeHora(cierra);
    const cd = colDesde === '' ? undefined : minutosDeHora(colDesde);
    const ch = colHasta === '' ? undefined : minutosDeHora(colHasta);
    if (a === undefined || c === undefined || (colDesde !== '' && cd === undefined) || (colHasta !== '' && ch === undefined)) {
      setAviso({ tipo: 'error', texto: 'Revisa las horas.' });
      return;
    }
    if ((cd === undefined) !== (ch === undefined)) {
      setAviso({ tipo: 'error', texto: 'Para la colación indica desde y hasta, o deja los dos vacíos.' });
      return;
    }
    aplicar((s, d) => personalizado(s, d, { abre: a, cierra: c, ...(cd !== undefined && ch !== undefined ? { colacion: { desde: cd, hasta: ch } } : {}) }));
  };

  const guardar = async (): Promise<void> => {
    const v = validarSemana(semana);
    if (!v.ok) {
      setAviso({ tipo: 'error', texto: v.error });
      return;
    }
    setOcupado(true);
    const r = await api.guardarHorario(localId, aDiasApi(semana));
    setOcupado(false);
    if (r.ok) {
      setSemana(desdeApi(r.value));
      setSinGuardar(false);
      setAviso({ tipo: 'exito', texto: 'Horario guardado como dato manual: manda sobre lo que el sistema aprenda o suponga.' });
    } else setAviso({ tipo: 'error', texto: mensajeDeError(r.error) });
  };

  return (
    <section className="pagina" aria-label="Editar horario de atención">
      <h2>Horario de atención</h2>
      <ul className="lista-dias" aria-label="Horario actual">
        {DIAS.map((d) => <li key={d.dia}><strong>{d.largo[0]?.toUpperCase()}{d.largo.slice(1)}:</strong> {resumenDia(semana[d.dia])}</li>)}
      </ul>
      {sinGuardar ? <Aviso>Hay cambios sin guardar.</Aviso> : null}

      <fieldset className="grupo-opciones">
        <legend>1. ¿A qué días?</legend>
        <div className="chips">
          {DIAS.map((d) => (
            <button key={d.dia} type="button" className="chip" aria-pressed={dias.includes(d.dia)} onClick={() => { alternarDia(d.dia); }}>{d.corto}</button>
          ))}
          <Opcion onClick={() => { setDias(LUN_A_VIE); }}>LUN A VIE</Opcion>
          <Opcion onClick={() => { setDias([]); }}>LIMPIAR</Opcion>
        </div>
      </fieldset>

      <fieldset className="grupo-opciones">
        <legend>2. ¿Qué pasa esos días?</legend>
        <div className="chips">
          <Opcion onClick={() => { aplicar(marcarCerrado); }}>CERRADO</Opcion>
          <Opcion onClick={() => { aplicar(marcarSinDato); }}>SIN DATO</Opcion>
        </div>
        <p><strong>Abre a las</strong></p>
        <div className="chips">
          {HORAS_ABRE.map((h) => <Opcion key={h} etiqueta={`Abre a las ${h}:00`} onClick={() => { aplicar((s, d) => abreA(s, d, h * 60)); }}>{`${h}:00`}</Opcion>)}
        </div>
        <p><strong>Cierra a las</strong></p>
        <div className="chips">
          {HORAS_CIERRA.map((h) => <Opcion key={h} etiqueta={`Cierra a las ${h}:00`} onClick={() => { aplicar((s, d) => cierraA(s, d, h * 60)); }}>{`${h}:00`}</Opcion>)}
        </div>
        <p><strong>Cierra por colación</strong></p>
        <div className="chips">
          {COLACIONES.map((c) => <Opcion key={c.texto} etiqueta={`Colación de ${c.texto}`} onClick={() => { aplicar((s, d) => conColacion(s, d, c.tramo)); }}>{c.texto}</Opcion>)}
          <Opcion onClick={() => { aplicar((s, d) => conColacion(s, d, undefined)); }}>SIN COLACIÓN</Opcion>
        </div>
        <div className="chips">
          <button type="button" className="chip" aria-expanded={otro} onClick={() => { setOtro(!otro); }}>OTRO HORARIO</button>
        </div>
        {otro ? (
          <div className="pagina">
            <Campo etiqueta="Abre a las" type="time" value={abre} onChange={(e) => { setAbre(e.target.value); }} />
            <Campo etiqueta="Cierra a las" type="time" value={cierra} onChange={(e) => { setCierra(e.target.value); }} />
            <Campo etiqueta="Colación desde (opcional)" type="time" value={colDesde} onChange={(e) => { setColDesde(e.target.value); }} />
            <Campo etiqueta="Colación hasta (opcional)" type="time" value={colHasta} onChange={(e) => { setColHasta(e.target.value); }} />
            <Boton variante="secundario" onClick={aplicarOtro}>APLICAR A LOS DÍAS ELEGIDOS</Boton>
          </div>
        ) : null}
      </fieldset>

      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}
      <Boton disabled={ocupado || !sinGuardar} onClick={() => void guardar()}>{ocupado ? 'GUARDANDO…' : 'GUARDAR HORARIO'}</Boton>
    </section>
  );
};
