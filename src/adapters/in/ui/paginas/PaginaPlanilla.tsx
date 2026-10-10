import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ok } from '../../../../domain/result';
import { nombreDeCamion } from '../../../../domain/patente';
import { leerPlanilla } from '../../../../domain/planilla';
import { fechaEnChile } from '../../../../domain/fechas';
import { mensajeDeError } from '../../../../application/mensajes';
import type { ResultadoFilaPlanilla } from '../../../../application/modelos';
import { AsignacionDelDia } from '../componentes/AsignacionDelDia';
import { useDiaDeReparto } from '../componentes/dia';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { Aviso, AreaTexto, Boton, Cargando, ErrorCarga, Pagina } from '../componentes/ui';

const Persona = ({ rol, p }: { readonly rol: string; readonly p: ResultadoFilaPlanilla['chofer'] }) =>
  p === undefined ? null : p.estado === 'enlazada' ? (
    <li>{rol} {p.nombre}: enlazado con su usuario.</li>
  ) : (
    <li><strong>{rol} {p.nombre}: no tiene usuario.</strong> Créalo en <Link to="/admin/usuarios">USUARIOS</Link> con su nombre y vuelve a pegar la planilla.</li>
  );

const FilaResultado = ({ f }: { readonly f: ResultadoFilaPlanilla }) => (
  <li className="tarjeta" aria-label={`Resultado ${f.patente}`}>
    <strong>{nombreDeCamion({ patente: f.patente, ...(f.alias !== undefined ? { alias: f.alias } : {}) })}</strong>
    {!f.valida ? (
      <ul>{f.errores.map((e) => <li key={e}><strong>No se aplicó:</strong> {e}</li>)}</ul>
    ) : (
      <ul>
        {f.camionCreado ? <li>{f.alias !== undefined ? `Camión nuevo, con el nombre ${f.alias}.` : 'Camión nuevo. Dos camiones terminan igual: ponle un nombre en CAMIONES.'}</li> : null}
        {f.vendedoresCreados > 0 ? <li>{f.vendedoresCreados === 1 ? '1 vendedor nuevo' : `${String(f.vendedoresCreados)} vendedores nuevos`}: cárgales el celular en VENDEDORES.</li> : null}
        <Persona rol="Chofer" p={f.chofer} />
        <Persona rol="Ayudante" p={f.ayudante} />
        {f.jornadasAbiertas > 0 ? <li>{f.jornadasAbiertas === 1 ? 'Ya tiene su camión elegido en la app.' : 'Ya tienen su camión elegido en la app.'}</li> : null}
      </ul>
    )}
  </li>
);

/** La planilla de la mañana (chofer, ayudante, camión, vendedores y comunas): se pega desde Excel y la app arma el día (ADR 0036 del back). */
export const PaginaPlanilla = () => {
  const { api, ahora } = useCasos();
  const { fecha, campos } = useDiaDeReparto(ahora);
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<readonly ResultadoFilaPlanilla[] | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);
  const leida = useMemo(() => leerPlanilla(texto), [texto]);

  const cargar = useCallback(() => (fecha === '' ? Promise.resolve(ok([])) : api.obtenerPlanilla(fecha)), [api, fecha]);
  const { estado, recargar, refrescar } = useCarga(cargar);

  const aplicar = async (): Promise<void> => {
    setOcupado(true);
    setError(undefined);
    setResultado(undefined);
    const r = await api.aplicarPlanilla(fecha, leida.filas);
    setOcupado(false);
    if (r.ok) {
      setResultado(r.value);
      refrescar();
    } else setError(mensajeDeError(r.error));
  };

  const esHoy = fecha === fechaEnChile(ahora());
  const hayTexto = texto.trim() !== '';
  const puedeAplicar = fecha !== '' && leida.filas.length > 0 && !ocupado;

  return (
    <Pagina titulo="Planilla del día">
      <p>Pega la planilla de la mañana tal como viene de Excel (con los títulos: Chofer, Ayudante, Camión o Patente, Vendedor y, si la trae, Comuna).</p>
      {campos}
      <AreaTexto
        etiqueta="Pega aquí la planilla"
        ayuda="Selecciona las filas en Excel, cópialas y pégalas aquí."
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setResultado(undefined); setError(undefined); }}
        rows={8}
      />
      {hayTexto && leida.faltantes.length > 0 ? <Aviso tipo="error">Falta la columna del camión: ponle CAMIÓN o PATENTE al título.</Aviso> : null}
      {hayTexto && leida.faltantes.length === 0 && leida.filas.length === 0 ? <Aviso tipo="error">No se encontraron filas con patente.</Aviso> : null}
      {hayTexto && leida.ignoradas.length > 0 ? <Aviso>No se usan estas columnas: {leida.ignoradas.join(', ')}.</Aviso> : null}
      {leida.filas.length > 0 ? (
        <>
          <h2>Se van a cargar {leida.filas.length === 1 ? '1 camión' : `${String(leida.filas.length)} camiones`}</h2>
          <ul className="tarjetas" aria-label="Vista previa de la planilla">
            {leida.filas.map((f) => (
              <li key={f.patente} className="tarjeta">
                <AsignacionDelDia a={{ camion: { id: f.patente, patente: f.patente }, ...(f.chofer !== undefined ? { chofer: { nombre: f.chofer } } : {}), ...(f.ayudante !== undefined ? { ayudante: { nombre: f.ayudante } } : {}), comunas: f.comunas ?? [], vendedores: (f.vendedores ?? []).map((v) => ({ id: v.codigo, codigo: v.codigo, nombre: v.nombre ?? '', activo: true })) }} />
              </li>
            ))}
          </ul>
          {esHoy ? <Aviso>Como es de hoy, cada chofer y ayudante que se encuentre en la app queda con su camión ya elegido.</Aviso> : null}
          <Boton disabled={!puedeAplicar} onClick={() => void aplicar()}>{ocupado ? 'APLICANDO…' : 'APLICAR LA PLANILLA'}</Boton>
        </>
      ) : null}
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      {resultado ? (
        <>
          <h2>Resultado</h2>
          <Aviso tipo={resultado.some((f) => !f.valida) ? 'error' : 'exito'}>
            {resultado.filter((f) => f.valida).length} de {resultado.length} camiones aplicados.
          </Aviso>
          <ul className="tarjetas">{resultado.map((f) => <FilaResultado key={f.patente} f={f} />)}</ul>
        </>
      ) : null}
      <h2>Lo que ya está cargado para este día</h2>
      {fecha === '' ? <Aviso>Elige la fecha para ver la planilla de ese día.</Aviso> : null}
      {estado.tipo === 'cargando' && fecha !== '' ? <Cargando /> : null}
      {estado.tipo === 'error' ? <ErrorCarga error={estado.error} alReintentar={recargar} /> : null}
      {estado.tipo === 'ok' && fecha !== '' && estado.datos.length === 0 ? <Aviso>Todavía no hay planilla para este día.</Aviso> : null}
      {estado.tipo === 'ok' && estado.datos.length > 0 ? (
        <ul className="tarjetas" aria-label="Planilla cargada">
          {estado.datos.map((a) => <li key={a.camion.id} className="tarjeta"><AsignacionDelDia a={a} /></li>)}
        </ul>
      ) : null}
    </Pagina>
  );
};
