import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { horaDeMinutos, minutosDeHora } from '../../../../domain/hora';
import { formatearPatente } from '../../../../domain/patente';
import { mensajeDeError } from '../../../../application/mensajes';
import type { Camion, Factura, ResultadoBusqueda } from '../../../../application/modelos';
import { puedeBuscar } from '../../../../application/use-cases/buscar';
import { useCasos } from '../contexto';
import { useCarga, useDebounced } from '../hooks';
import { useDiaDeReparto } from '../componentes/dia';
import { Aviso, AreaTexto, Boton, Campo, Cargando, ErrorCarga, Insignia, Pagina, Selector } from '../componentes/ui';

const nombreCamion = (c: { patente: string; alias?: string | undefined }): string => (c.alias ? `${c.alias} · ${formatearPatente(c.patente)}` : formatearPatente(c.patente));

const BuscadorCliente = ({ elegido, alElegir }: { readonly elegido: ResultadoBusqueda | undefined; readonly alElegir: (r: ResultadoBusqueda | undefined) => void }) => {
  const { api } = useCasos();
  const [texto, setTexto] = useState('');
  const consulta = useDebounced(texto, 250);
  const [resultados, setResultados] = useState<{ consulta: string; lista: readonly ResultadoBusqueda[]; error?: string } | undefined>();

  useEffect(() => {
    if (elegido || !puedeBuscar(consulta)) return;
    const control = new AbortController();
    void api.buscarClientes(consulta, { limite: 6, signal: control.signal }).then((r) => {
      if (control.signal.aborted) return;
      setResultados(r.ok ? { consulta, lista: r.value } : { consulta, lista: [], error: mensajeDeError(r.error) });
    });
    return () => { control.abort(); };
  }, [api, consulta, elegido]);

  if (elegido) {
    return (
      <div className="tarjeta" aria-label="Cliente elegido">
        <strong>{elegido.razonSocial}</strong>
        <span>{elegido.direccion}, {elegido.comuna}</span>
        <div className="fila-botones"><Boton variante="secundario" onClick={() => { alElegir(undefined); setTexto(''); }}>CAMBIAR CLIENTE</Boton></div>
      </div>
    );
  }
  const actual = puedeBuscar(consulta) && resultados?.consulta === consulta ? resultados : undefined;
  return (
    <div className="pagina">
      <Campo etiqueta="Cliente" ayuda="Escribe parte del nombre o la dirección." type="search" value={texto} onChange={(e) => { setTexto(e.target.value); }} autoComplete="off" autoCapitalize="none" spellCheck={false} />
      {puedeBuscar(consulta) && !actual ? <Cargando texto="Buscando…" /> : null}
      {actual?.error ? <Aviso tipo="error">{actual.error}</Aviso> : null}
      {actual && !actual.error && actual.lista.length === 0 ? <Aviso>No hay clientes con ese texto.</Aviso> : null}
      {actual && actual.lista.length > 0 ? (
        <ul className="tarjetas">
          {actual.lista.map((r) => (
            <li key={r.localId}>
              <button type="button" className="tarjeta tarjeta-boton" onClick={() => { alElegir(r); }}>
                <strong>{r.razonSocial}</strong>
                <span>{r.direccion}, {r.comuna}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

const FilaFactura = ({ f, camiones, alCambiar }: { readonly f: Factura; readonly camiones: readonly Camion[]; readonly alCambiar: () => void }) => {
  const { api } = useCasos();
  const [error, setError] = useState<string | undefined>();
  const aplicar = async (cambios: Parameters<typeof api.actualizarFactura>[1]): Promise<void> => {
    setError(undefined);
    const r = await api.actualizarFactura(f.id, cambios);
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
      <Selector etiqueta={`Camión de la factura ${f.folio}`} value={f.camion?.id ?? ''} onChange={(e) => void aplicar({ camionId: e.target.value === '' ? null : e.target.value })}>
        <option value="">Sin camión</option>
        {camiones.map((c) => <option key={c.id} value={c.id}>{nombreCamion(c)}</option>)}
      </Selector>
      <div className="fila-botones"><Boton variante="peligro" onClick={() => void aplicar({ estado: 'anulada' })}>{`ANULAR ${f.folio}`}</Boton></div>
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </li>
  );
};

export const PaginaFacturas = () => {
  const { api, ahora } = useCasos();
  const { fecha, campos: camposDia } = useDiaDeReparto(ahora);

  const [camionId, setCamionId] = useState('');
  const [cliente, setCliente] = useState<ResultadoBusqueda | undefined>();
  const [folio, setFolio] = useState('');
  const [antesDe, setAntesDe] = useState('');
  const [urgente, setUrgente] = useState(false);
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [guardada, setGuardada] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);
  const folioRef = useRef<HTMLInputElement>(null);

  const cargarCamiones = useCallback(() => api.listarCamiones(), [api]);
  const camiones = useCarga(cargarCamiones);
  const lista = useMemo(() => (camiones.estado.tipo === 'ok' ? camiones.estado.datos : []), [camiones.estado]);

  const cargarFacturas = useCallback(() => (fecha === '' ? Promise.resolve({ ok: true as const, value: [] as readonly Factura[] }) : api.listarFacturas({ fecha })), [api, fecha]);
  const facturas = useCarga(cargarFacturas);

  const enviar = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    setError(undefined);
    setGuardada(undefined);
    if (!cliente) {
      setError('Elige el cliente.');
      return;
    }
    if (fecha === '') {
      setError('Elige el día de reparto.');
      return;
    }
    const antes = antesDe === '' ? undefined : minutosDeHora(antesDe);
    if (antesDe !== '' && antes === undefined) {
      setError('La hora límite no es válida.');
      return;
    }
    setOcupado(true);
    const r = await api.registrarFactura({
      folio, localId: cliente.localId, fecha,
      ...(camionId !== '' ? { camionId } : {}),
      ...(antes !== undefined ? { antesDeMin: antes } : {}),
      ...(urgente ? { urgente: true } : {}),
      ...(nota.trim() !== '' ? { nota: nota.trim() } : {}),
    });
    setOcupado(false);
    if (!r.ok) {
      setError(mensajeDeError(r.error));
      return;
    }
    // El camión y el día se mantienen: se ingresan varias facturas seguidas.
    setGuardada(`Factura ${r.value.folio} guardada para ${r.value.local.razonSocial}.`);
    setCliente(undefined);
    setFolio('');
    setAntesDe('');
    setUrgente(false);
    setNota('');
    facturas.refrescar();
    folioRef.current?.focus();
  };

  const porCamion = useMemo(() => {
    const grupos = new Map<string, { titulo: string; items: Factura[] }>();
    const datos = facturas.estado.tipo === 'ok' ? facturas.estado.datos : [];
    for (const f of datos) {
      const clave = f.camion?.id ?? '';
      const g = grupos.get(clave) ?? { titulo: f.camion ? nombreCamion(f.camion) : 'Sin camión', items: [] };
      g.items.push(f);
      grupos.set(clave, g);
    }
    return [...grupos.entries()].sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : 0)).map(([clave, g]) => ({ clave, ...g }));
  }, [facturas.estado]);

  return (
    <Pagina titulo="Facturas del día">
      <form className="pagina" onSubmit={(e) => void enviar(e)} noValidate>
        {camposDia}

        <Selector etiqueta="Camión" value={camionId} onChange={(e) => { setCamionId(e.target.value); }}>
          <option value="">Sin asignar todavía</option>
          {lista.map((c) => <option key={c.id} value={c.id}>{nombreCamion(c)}</option>)}
        </Selector>
        {camiones.estado.tipo === 'error' ? <ErrorCarga error={camiones.estado.error} alReintentar={camiones.recargar} /> : null}

        <BuscadorCliente elegido={cliente} alElegir={setCliente} />
        <Campo ref={folioRef} etiqueta="Número de factura (folio)" value={folio} onChange={(e) => { setFolio(e.target.value); }} inputMode="numeric" autoComplete="off" />
        <Campo etiqueta="Entregar antes de (opcional)" type="time" value={antesDe} onChange={(e) => { setAntesDe(e.target.value); }} />
        <label className="casilla"><input type="checkbox" checked={urgente} onChange={(e) => { setUrgente(e.target.checked); }} /> Urgente</label>
        <AreaTexto etiqueta="Nota (opcional)" value={nota} onChange={(e) => { setNota(e.target.value); }} maxLength={300} />
        {error ? <Aviso tipo="error">{error}</Aviso> : null}
        <Boton type="submit" disabled={ocupado}>{ocupado ? 'GUARDANDO…' : 'GUARDAR FACTURA'}</Boton>
        {guardada ? <Aviso tipo="exito">{guardada}</Aviso> : null}
      </form>

      <h2>Facturas de ese día</h2>
      {facturas.estado.tipo === 'cargando' ? <Cargando /> : null}
      {facturas.estado.tipo === 'error' ? <ErrorCarga error={facturas.estado.error} alReintentar={facturas.recargar} /> : null}
      {facturas.estado.tipo === 'ok' && facturas.estado.datos.length === 0 ? <Aviso>Aún no hay facturas para este día.</Aviso> : null}
      {porCamion.map((g) => (
        <section key={g.clave} className="pagina" aria-label={g.titulo}>
          <h3>{g.titulo} ({g.items.length})</h3>
          <ul className="tarjetas">{g.items.map((f) => <FilaFactura key={f.id} f={f} camiones={lista} alCambiar={facturas.refrescar} />)}</ul>
        </section>
      ))}
    </Pagina>
  );
};
