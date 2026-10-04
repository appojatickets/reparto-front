import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router';
import { horaDeMinutos, minutosDeHora } from '../../../../domain/hora';
import { leerLineaFactura } from '../../../../domain/linea-factura';
import { mensajeDeError } from '../../../../application/mensajes';
import type { Factura, Jornada, ResultadoBusqueda } from '../../../../application/modelos';
import { puedeBuscar } from '../../../../application/use-cases/buscar';
import { useCasos } from '../contexto';
import { useCarga, useDebounced } from '../hooks';
import { AreaTexto, Aviso, Boton, Campo, Cargando, ErrorCarga, Insignia, Pagina } from '../componentes/ui';

const Condiciones = ({ f, alGuardar }: { readonly f: Factura; readonly alGuardar: () => void }) => {
  const { api } = useCasos();
  const [antesDe, setAntesDe] = useState(f.antesDeMin === undefined ? '' : horaDeMinutos(f.antesDeMin));
  const [urgente, setUrgente] = useState(f.urgente);
  const [nota, setNota] = useState(f.nota ?? '');
  const [error, setError] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);

  const guardar = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    const m = antesDe === '' ? null : minutosDeHora(antesDe);
    if (antesDe !== '' && m === undefined) {
      setError('La hora límite no es válida.');
      return;
    }
    setOcupado(true);
    setError(undefined);
    const r = await api.actualizarFactura(f.id, { antesDeMin: m ?? null, urgente, nota: nota.trim() === '' ? null : nota.trim() });
    setOcupado(false);
    if (r.ok) alGuardar();
    else setError(mensajeDeError(r.error));
  };

  return (
    <form className="pagina" onSubmit={(e) => void guardar(e)} noValidate>
      <Campo etiqueta={`Entregar antes de (factura ${f.folio})`} type="time" value={antesDe} onChange={(e) => { setAntesDe(e.target.value); }} />
      <label className="casilla"><input type="checkbox" checked={urgente} onChange={(e) => { setUrgente(e.target.checked); }} /> Urgente</label>
      <AreaTexto etiqueta={`Nota (factura ${f.folio})`} value={nota} onChange={(e) => { setNota(e.target.value); }} maxLength={300} />
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      <Boton type="submit" disabled={ocupado}>GUARDAR CONDICIONES</Boton>
    </form>
  );
};

const TarjetaFactura = ({ f, alCambiar }: { readonly f: Factura; readonly alCambiar: () => void }) => {
  const { api } = useCasos();
  const [abierta, setAbierta] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const anular = async (): Promise<void> => {
    const r = await api.actualizarFactura(f.id, { estado: 'anulada' });
    if (r.ok) alCambiar();
    else setError(mensajeDeError(r.error));
  };
  return (
    <li className="tarjeta">
      <strong>Factura {f.folio} · {f.local.razonSocial}</strong>
      <span>{f.local.direccion}, {f.local.comuna}</span>
      <span className="insignias">
        {f.urgente ? <Insignia>URGENTE</Insignia> : null}
        {f.antesDeMin !== undefined ? <Insignia>ANTES DE {horaDeMinutos(f.antesDeMin)}</Insignia> : null}
        {!f.local.tienePin ? <Insignia>SIN PIN</Insignia> : null}
      </span>
      {f.nota ? <span>Nota: {f.nota}</span> : null}
      <div className="fila-botones">
        <Boton variante="secundario" aria-expanded={abierta} aria-label={`CONDICIONES ${f.folio}`} onClick={() => { setAbierta(!abierta); }}>CONDICIONES</Boton>
        <Boton variante="peligro" aria-label={`ANULAR ${f.folio}`} onClick={() => void anular()}>ANULAR</Boton>
      </div>
      {abierta ? <Condiciones f={f} alGuardar={() => { setAbierta(false); alCambiar(); }} /> : null}
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </li>
  );
};

const Carga = ({ jornada }: { readonly jornada: Jornada }) => {
  const { api } = useCasos();
  const [texto, setTexto] = useState('');
  const consulta = useDebounced(texto, 250);
  const linea = useMemo(() => leerLineaFactura(texto), [texto]);
  const lineaConsulta = useMemo(() => leerLineaFactura(consulta), [consulta]);
  const [resultados, setResultados] = useState<{ consulta: string; lista: readonly ResultadoBusqueda[]; error?: string } | undefined>();
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'exito'; texto: string } | undefined>();
  const [ocupado, setOcupado] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  const cargarLista = useCallback(() => api.listarFacturas({ fecha: jornada.fecha }), [api, jornada.fecha]);
  const lista = useCarga(cargarLista);

  useEffect(() => {
    if (!puedeBuscar(lineaConsulta.consulta)) return;
    const control = new AbortController();
    void api.buscarClientes(lineaConsulta.consulta, { limite: 6, signal: control.signal }).then((r) => {
      if (control.signal.aborted) return;
      setResultados(r.ok ? { consulta: lineaConsulta.consulta, lista: r.value } : { consulta: lineaConsulta.consulta, lista: [], error: mensajeDeError(r.error) });
    });
    return () => { control.abort(); };
  }, [api, lineaConsulta.consulta]);

  const buscando = puedeBuscar(linea.consulta);
  const actual = buscando && resultados?.consulta === lineaConsulta.consulta && lineaConsulta.consulta === linea.consulta ? resultados : undefined;

  const guardar = async (c: ResultadoBusqueda): Promise<void> => {
    if (linea.folio === undefined) {
      setAviso({ tipo: 'error', texto: 'Falta el número de factura. Empieza la línea con el número, por ejemplo: 1234 minimarket rabet.' });
      return;
    }
    setOcupado(true);
    setAviso(undefined);
    const r = await api.registrarFactura({ folio: linea.folio, localId: c.localId, camionId: jornada.camion.id, fecha: jornada.fecha });
    setOcupado(false);
    if (!r.ok) {
      setAviso({ tipo: 'error', texto: mensajeDeError(r.error) });
      return;
    }
    setAviso({ tipo: 'exito', texto: `Factura ${r.value.folio} cargada para ${r.value.local.razonSocial}.` });
    setTexto('');
    setResultados(undefined);
    lista.refrescar();
    campo.current?.focus();
  };

  const facturas = lista.estado.tipo === 'ok' ? lista.estado.datos : [];

  return (
    <>
      <Campo
        ref={campo}
        etiqueta="Factura y cliente"
        ayuda="Dicta o escribe el número de factura y el nombre del cliente. Ejemplo: 1234 minimarket rabet. Para dictar usa el micrófono del teclado."
        type="text"
        value={texto}
        onChange={(e) => { setTexto(e.target.value); }}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus
      />
      {texto.trim() !== '' ? (
        <p role="status">
          {linea.folio !== undefined ? <>Factura <strong>{linea.folio}</strong></> : <strong>Falta el número de factura</strong>}
          {linea.consulta !== '' ? <> · Cliente: <strong>{linea.consulta}</strong></> : null}
        </p>
      ) : null}
      {buscando && !actual ? <Cargando texto="Buscando…" /> : null}
      {actual?.error ? <Aviso tipo="error">{actual.error}</Aviso> : null}
      {actual && !actual.error && actual.lista.length === 0 ? <Aviso>No encuentro ese cliente. Prueba con menos letras o avisa en la oficina.</Aviso> : null}
      {actual && actual.lista.length > 0 ? (
        <>
          <p role="status">Toca el cliente correcto para guardar la factura:</p>
          <ul className="tarjetas">
            {actual.lista.map((c) => (
              <li key={c.localId}>
                <button type="button" className="tarjeta tarjeta-boton" disabled={ocupado} onClick={() => void guardar(c)}>
                  <strong>{c.razonSocial}</strong>
                  <span>{c.direccion}, {c.comuna}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}

      <h2>Cargadas hoy ({facturas.length})</h2>
      {facturas.length > 0 ? <Link className="big-button big-button--primario" to="/mi-ruta">CALCULAR MI RUTA</Link> : null}
      {lista.estado.tipo === 'cargando' ? <Cargando /> : null}
      {lista.estado.tipo === 'error' ? <ErrorCarga error={lista.estado.error} alReintentar={lista.recargar} /> : null}
      {lista.estado.tipo === 'ok' && facturas.length === 0 ? <Aviso>Aún no cargas ninguna factura hoy.</Aviso> : null}
      <ul className="tarjetas">{facturas.map((f) => <TarjetaFactura key={f.id} f={f} alCambiar={lista.refrescar} />)}</ul>
    </>
  );
};

export const PaginaCargar = () => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.miJornada(), [api]);
  const { estado, recargar } = useCarga(cargar);
  return (
    <Pagina titulo="Cargar facturas">
      {estado.tipo === 'cargando' ? <Cargando /> : null}
      {estado.tipo === 'error' ? <ErrorCarga error={estado.error} alReintentar={recargar} /> : null}
      {estado.tipo === 'ok' && !estado.datos ? <Aviso tipo="error">Primero elige el camión que manejas hoy. <Link to="/">Ir al inicio</Link></Aviso> : null}
      {estado.tipo === 'ok' && estado.datos ? <Carga jornada={estado.datos} /> : null}
    </Pagina>
  );
};
