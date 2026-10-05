import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { enlaceRutaGoogleMaps } from '../../../../domain/enlaces';
import { horaDeMinutos } from '../../../../domain/hora';
import { textoMotivos } from '../../../../domain/motivos';
import { formatearPatente } from '../../../../domain/patente';
import { esDeCamion } from '../../../../domain/rol';
import { mismoTexto } from '../../../../domain/texto';
import { mensajeDeError } from '../../../../application/mensajes';
import type { ItemRuta, OperacionRuta, ParadaDeRuta, VistaRuta } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { AccionesParada } from '../componentes/AccionesParada';
import { FotoFachada } from '../componentes/FotoFachada';
import { useDiaDeReparto } from '../componentes/dia';
import { useUsuario } from '../sesion';
import { Aviso, Boton, Cargando, Direccion, ErrorCarga, Insignia, Pagina, Selector } from '../componentes/ui';

const REFRESCO_MS = 3 * 60 * 1000;

const Etiquetas = ({ i }: { readonly i: ItemRuta }) => (
  <span className="insignias">
    {i.urgente ? <Insignia>URGENTE</Insignia> : null}
    {i.antesDeMin !== undefined ? <Insignia>ANTES DE {horaDeMinutos(i.antesDeMin)}</Insignia> : null}
  </span>
);

/**
 * Una fila de la lista de paradas: número, nombre y comuna (y a qué hora llega). Al tocarla se despliega con el resto de los datos y las
 * acciones; así el chofer ve toda su ruta de un vistazo y solo abre la parada que le toca.
 */
const FilaParada = ({ p, total, ocupado, operar, enCamion, alCambiar, abierta, alAbrir, esSiguiente }: {
  readonly p: ParadaDeRuta; readonly total: number; readonly ocupado: boolean; readonly operar: (o: OperacionRuta) => void; readonly enCamion: boolean;
  readonly alCambiar: () => void; readonly abierta: boolean; readonly alAbrir: () => void; readonly esSiguiente: boolean;
}) => {
  const [mas, setMas] = useState(false);
  const motivos = textoMotivos(p.motivos);
  const n = p.posicion + 1;
  const idDetalle = `parada-${p.facturaId}`;
  return (
    <li className={`parada${esSiguiente ? ' parada--siguiente' : ''}`} aria-label={`Parada ${n}`}>
      <button type="button" className="parada-fila" aria-expanded={abierta} aria-controls={idDetalle} onClick={alAbrir}>
        <span className="parada-num" aria-hidden="true">{n}</span>
        <span className="parada-nombre">
          <strong>{p.cliente}</strong>
          <span className="comuna">{p.comuna}</span>
          {esSiguiente ? <span className="parada-marca">SIGUIENTE</span> : null}
          {p.urgente ? <span className="parada-marca">URGENTE</span> : null}
        </span>
      </button>
      {abierta ? (
        <div className="parada-detalle" id={idDetalle}>
          {!mismoTexto(p.cliente, p.direccion) ? <Direccion direccion={p.direccion} comuna={p.comuna} /> : null}
          <FotoFachada localId={p.localId} cliente={p.cliente} tieneFoto={p.tieneFoto === true} />
          {p.folio ? <span>Factura {p.folio}</span> : null}
          <Etiquetas i={p} />
          {p.fijada ? <Insignia>FIJADA AL INICIO</Insignia> : null}
          {p.ubicacionAproximada ? (
            <span className="ayuda">Ubicación aproximada: te guía por la dirección. Al llegar, tu GPS la mejora. <Link to={`/clientes/${p.localId}`}>Fijar el pin</Link></span>
          ) : null}
          {p.nota ? <span>Nota: {p.nota}</span> : null}
          {motivos !== '' ? <span className="ayuda">{motivos}</span> : null}
          {enCamion ? <AccionesParada p={p} alCambiar={alCambiar} alPosponer={() => { operar({ tipo: 'despues', facturaId: p.facturaId }); }} /> : null}
          <div className="fila-botones">
            <Boton variante="secundario" disabled={ocupado || p.posicion === 0} aria-label={`SUBIR ${p.cliente}`} onClick={() => { operar({ tipo: 'subir', facturaId: p.facturaId }); }}>SUBIR</Boton>
            <Boton variante="secundario" disabled={ocupado || p.posicion === total - 1} aria-label={`BAJAR ${p.cliente}`} onClick={() => { operar({ tipo: 'bajar', facturaId: p.facturaId }); }}>BAJAR</Boton>
            <Boton variante="secundario" aria-expanded={mas} aria-label={`MÁS OPCIONES ${p.cliente}`} onClick={() => { setMas(!mas); }}>MÁS</Boton>
          </div>
          {mas ? (
            <div className="fila-botones">
              <Boton disabled={ocupado} aria-label={`IR PRIMERO ${p.cliente}`} onClick={() => { operar({ tipo: 'primero', facturaId: p.facturaId }); }}>IR PRIMERO</Boton>
              <Boton variante="secundario" disabled={ocupado} aria-label={`DEJAR PARA DESPUÉS ${p.cliente}`} onClick={() => { operar({ tipo: 'despues', facturaId: p.facturaId }); }}>DEJAR PARA DESPUÉS</Boton>
              <Boton variante="peligro" disabled={ocupado} aria-label={`QUITAR DEL CAMIÓN ${p.cliente}`} onClick={() => { operar({ tipo: 'quitar', facturaId: p.facturaId }); }}>QUITAR DEL CAMIÓN</Boton>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
};

type Hecha = { readonly facturaId: string; readonly cliente: string; readonly direccion: string; readonly comuna: string; readonly estado: 'entregada' | 'no_entregada' };

/** Una parada ya hecha: queda en la lista con su nombre tachado y su resultado (✓ o ✗, siempre con texto, no solo color). */
const FilaHecha = ({ h, enCamion, alCambiar, abierta, alAbrir }: { readonly h: Hecha; readonly enCamion: boolean; readonly alCambiar: () => void; readonly abierta: boolean; readonly alAbrir: () => void }) => {
  const idDetalle = `hecha-${h.facturaId}`;
  const entregada = h.estado === 'entregada';
  return (
    <li className="parada parada--hecha">
      <button type="button" className="parada-fila" aria-expanded={abierta} aria-controls={idDetalle} onClick={alAbrir}>
        <span className="parada-num" aria-hidden="true">{entregada ? '✓' : '✗'}</span>
        <span className="parada-nombre">
          <strong className="tachado">{h.cliente}</strong>
          <span className="comuna">{h.comuna}</span>
        </span>
        <span className="parada-hora">{entregada ? 'ENTREGADA' : 'NO ENTREGADA'}</span>
      </button>
      {abierta ? (
        <div className="parada-detalle" id={idDetalle}>
          {!mismoTexto(h.cliente, h.direccion) ? <Direccion direccion={h.direccion} comuna={h.comuna} /> : null}
          <Insignia>{entregada ? 'ENTREGADA' : 'NO ENTREGADA'}</Insignia>
          {enCamion ? <DeshacerHecha h={h} alCambiar={alCambiar} /> : null}
        </div>
      ) : null}
    </li>
  );
};

/** Por si se tocó ENTREGADO sin querer: la entrega vuelve a pendiente. */
const DeshacerHecha = ({ h, alCambiar }: { readonly h: { readonly facturaId: string; readonly cliente: string }; readonly alCambiar: () => void }) => {
  const { api } = useCasos();
  const [error, setError] = useState<string | undefined>();
  const deshacer = async (): Promise<void> => {
    const r = await api.actualizarFactura(h.facturaId, { estado: 'pendiente' });
    if (r.ok) alCambiar();
    else setError(mensajeDeError(r.error));
  };
  return (
    <>
      <Boton variante="secundario" aria-label={`DESHACER ${h.cliente}`} onClick={() => void deshacer()}>DESHACER</Boton>
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </>
  );
};

const Resumen = ({ v }: { readonly v: VistaRuta }) => (
  <div className="tarjeta" aria-label="Resumen de la ruta">
    <span>Paradas: <strong>{v.paradas.length}</strong></span>
    <Insignia>{v.modo === 'manual' ? 'ACOMODADA A MANO' : 'ORDEN SUGERIDO'}</Insignia>
  </div>
);

/** Una entrega que aún no está en la ruta (nueva, sin pin o que no se puede atender): fila compacta que se despliega al tocarla. */
const FilaItem = ({ i, children }: { readonly i: ItemRuta; readonly children?: React.ReactNode }) => {
  const [abierta, setAbierta] = useState(false);
  const idDetalle = `item-${i.facturaId}`;
  return (
    <li className="parada">
      <button type="button" className="parada-fila" aria-expanded={abierta} aria-controls={idDetalle} onClick={() => { setAbierta(!abierta); }}>
        <span className="parada-num" aria-hidden="true">•</span>
        <span className="parada-nombre">
          <strong>{i.cliente}</strong>
          <span className="comuna">{i.comuna}</span>
          {i.urgente ? <span className="parada-marca">URGENTE</span> : null}
        </span>
      </button>
      {abierta ? (
        <div className="parada-detalle" id={idDetalle}>
          {!mismoTexto(i.cliente, i.direccion) ? <Direccion direccion={i.direccion} comuna={i.comuna} /> : null}
          <Etiquetas i={i} />
          {children}
        </div>
      ) : null}
    </li>
  );
};

const ListaItems = ({ titulo, items, children }: { readonly titulo: string; readonly items: readonly ItemRuta[]; readonly children?: (i: ItemRuta) => React.ReactNode }) =>
  items.length === 0 ? null : (
    <section className="pagina" aria-label={titulo}>
      <h2>{titulo} ({items.length})</h2>
      <ul className="paradas">
        {items.map((i) => <FilaItem key={i.facturaId} i={i}>{children?.(i)}</FilaItem>)}
      </ul>
    </section>
  );

/** Todo el estado de UN camión y día vive aquí: al cambiar de camión o de día se vuelve a montar y parte limpio. */
export const RutaDelCamion = ({ camionId, fecha }: { readonly camionId: string; readonly fecha: string }) => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.verRuta(camionId, fecha), [api, camionId, fecha]);
  const { estado, recargar, refrescar } = useCarga(cargar);
  const [actualizada, setActualizada] = useState<VistaRuta | undefined>();
  const [aviso, setAviso] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  /** Parada desplegada: sin elegir, la siguiente; `null` = todas cerradas. */
  const [abierta, setAbierta] = useState<string | null | undefined>(undefined);
  const { rol } = useUsuario();
  const enCamion = esDeCamion(rol);
  /** Después de entregar o avisar: se vuelve a pedir la ruta (la parada hecha sale de la lista y las horas se corren). */
  const recargarVista = (): void => {
    setActualizada(undefined);
    refrescar();
  };

  const vista = actualizada ?? (estado.tipo === 'ok' ? estado.datos : undefined);

  const aplicar = async (llamada: () => ReturnType<typeof api.planificarRuta>): Promise<void> => {
    setOcupado(true);
    setAviso(undefined);
    setConfirmar(false);
    const r = await llamada();
    setOcupado(false);
    if (r.ok) {
      setActualizada(r.value);
      return;
    }
    setAviso(mensajeDeError(r.error));
    if (r.error.codigo === 'RUTA_DESACTUALIZADA' || r.error.status === 409) {
      setActualizada(undefined);
      refrescar();
    }
  };

  const planificar = (): Promise<void> => aplicar(() => api.planificarRuta(camionId, fecha));
  const operar = (operacion: OperacionRuta): void => {
    const version = vista?.version;
    if (version === undefined) return;
    void aplicar(() => api.operarRuta(camionId, fecha, version, operacion));
  };
  /** Elegir por cuál se empieza: esa parada queda primera y el resto se vuelve a ordenar desde ahí (también si la ruta estaba acomodada a mano). */
  const elegirPrimera = (facturaId: string): void => {
    const version = vista?.version;
    if (version === undefined || facturaId === '') return;
    void aplicar(async () => {
      const r = await api.operarRuta(camionId, fecha, version, { tipo: 'primero', facturaId });
      const siguiente = r.ok ? r.value.version : undefined;
      return r.ok && r.value.modo === 'manual' && siguiente !== undefined ? api.operarRuta(camionId, fecha, siguiente, { tipo: 'ordenar' }) : r;
    });
  };

  /** La lista se mantiene al día sola: cada pocos minutos y al volver a la app (por ejemplo desde Waze) se recalculan las horas. */
  useEffect(() => {
    const actualizar = (): void => {
      if (document.visibilityState === 'visible') recargarVista();
    };
    const cada = setInterval(actualizar, REFRESCO_MS);
    document.addEventListener('visibilitychange', actualizar);
    return () => {
      clearInterval(cada);
      document.removeEventListener('visibilitychange', actualizar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recargarVista solo usa setters estables
  }, []);

  /** El chofer no arma su ruta: apenas tiene facturas cargadas y sin ordenar, el sistema la calcula solo (una vez por visita). */
  const calculadaSola = useRef(false);
  const hayQueOrdenar = enCamion && vista !== undefined && !vista.planificada && vista.nuevas.length > 0;
  useEffect(() => {
    if (!hayQueOrdenar || calculadaSola.current || ocupado) return;
    calculadaSola.current = true;
    void planificar();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se calcula una sola vez cuando aparecen facturas por ordenar
  }, [hayQueOrdenar]);

  /**
   * Si el chofer sigue cargando facturas con la ruta ya calculada, el sistema las integra solo: reordena lo que queda (ruta sugerida) o,
   * si el chofer acomodó la ruta a mano, las inserta en el mejor lugar sin mover lo demás. Una vez por cada grupo de entregas nuevas.
   */
  const integrada = useRef('');
  const nuevasSinIntegrar = enCamion && vista?.planificada === true ? vista.nuevas.map((n) => n.facturaId).join(',') : '';
  useEffect(() => {
    if (nuevasSinIntegrar === '' || nuevasSinIntegrar === integrada.current || ocupado) return;
    integrada.current = nuevasSinIntegrar;
    operar({ tipo: vista?.modo === 'manual' ? 'insertar' : 'ordenar' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se integra una vez por cada grupo de entregas nuevas
  }, [nuevasSinIntegrar, ocupado]);

  if (estado.tipo === 'cargando' && !vista) return <Cargando />;
  if (estado.tipo === 'error') {
    const e = estado.error;
    const sinDeposito = e.kind === 'HTTP' && e.status === 422 && JSON.stringify(e.detalle ?? '').includes('SIN_DEPOSITO');
    return sinDeposito ? <Aviso tipo="error">Falta configurar el depósito. <Link to="/admin/configuracion">Ir a la configuración</Link></Aviso> : <ErrorCarga error={e} alReintentar={recargar} />;
  }
  if (!vista) return null;

  return (
    <>
      {aviso ? <Aviso tipo="error">{aviso}</Aviso> : null}
      {!vista.planificada ? (
        <>
          <Aviso>
            Esta ruta aún no está calculada.{' '}
            {vista.nuevas.length === 0 ? (
              enCamion ? (
                <>
                  Todavía no cargaste las facturas de hoy. Cárgalas (por voz o escribiendo) y la ruta se arma sola, según cercanía, horarios y prioridades.{' '}
                  <Link to="/cargar">CARGAR FACTURAS</Link>
                </>
              ) : (
                <>
                  Este camión no tiene facturas cargadas ese día. Las carga su chofer desde el celular (o puedes cargarlas tú en <Link to="/facturas">FACTURAS DEL DÍA</Link>); la ruta se arma con ellas.
                </>
              )
            ) : enCamion ? `Calculando tu ruta con ${vista.nuevas.length} facturas…` : `Hay ${vista.nuevas.length} facturas por ordenar.`}
          </Aviso>
          <Boton disabled={ocupado || vista.nuevas.length === 0} onClick={() => void planificar()}>{ocupado ? 'CALCULANDO…' : 'CALCULAR RUTA SUGERIDA'}</Boton>
        </>
      ) : (
        <>
          <Resumen v={vista} />
          {enCamion && vista.paradas.length > 0 ? <a className="big-button big-button--secundario" href={enlaceRutaGoogleMaps(vista.paradas.map((x) => ({ direccion: x.direccion, comuna: x.comuna, lat: x.lat, lng: x.lng }))) ?? '#'} target="_blank" rel="noreferrer">LAS PRÓXIMAS {Math.min(vista.paradas.length, 9)} EN GOOGLE MAPS</a> : null}
          {vista.paradas.length >= 2 ? (
            <Selector etiqueta="Primera entrega (el resto se ordena desde ahí)" value="" disabled={ocupado} onChange={(e) => { elegirPrimera(e.target.value); }}>
              <option value="">Elige por cuál empiezas…</option>
              {vista.paradas.map((p) => <option key={p.facturaId} value={p.facturaId}>{`${p.posicion + 1}. ${p.cliente} · ${p.comuna}`}</option>)}
            </Selector>
          ) : null}
          <Boton variante="secundario" disabled={ocupado || vista.paradas.length < 2} onClick={() => { operar({ tipo: 'ordenar' }); }}>ORDENAR LO QUE QUEDA</Boton>
          {!confirmar ? (
            <Boton variante="secundario" disabled={ocupado} onClick={() => { setConfirmar(true); }}>VOLVER A CALCULAR DESDE CERO</Boton>
          ) : (
            <div className="tarjeta">
              <Aviso tipo="error">Esto descarta el orden actual{vista.modo === 'manual' ? ', incluido lo que acomodaste a mano' : ''} y calcula uno nuevo.</Aviso>
              <div className="fila-botones">
                <Boton variante="peligro" disabled={ocupado} onClick={() => void planificar()}>SÍ, RECALCULAR</Boton>
                <Boton variante="secundario" onClick={() => { setConfirmar(false); }}>NO, DEJARLA</Boton>
              </div>
            </div>
          )}

          {vista.paradas.length === 0 ? <Aviso>Ninguna parada se pudo ubicar en la ruta.</Aviso> : null}
          <p role="status" className="ayuda">Toca una parada para ver sus datos y acciones.</p>
          <ol className="paradas" aria-label="Paradas en orden">
            {vista.paradas.map((p, i) => (
              <FilaParada
                key={p.facturaId}
                p={p}
                total={vista.paradas.length}
                ocupado={ocupado}
                operar={operar}
                enCamion={enCamion}
                alCambiar={recargarVista}
                esSiguiente={i === 0}
                abierta={(abierta ?? vista.paradas[0]?.facturaId) === p.facturaId}
                alAbrir={() => { setAbierta((actual) => ((actual ?? vista.paradas[0]?.facturaId) === p.facturaId ? null : p.facturaId)); }}
              />
            ))}
          </ol>
        </>
      )}

      {vista.hechas.length > 0 ? (
        <section className="pagina" aria-label="Hechas hoy">
          <h2>Hechas hoy ({vista.hechas.length})</h2>
          <ul className="paradas">
            {vista.hechas.map((h) => (
              <FilaHecha key={h.facturaId} h={h} enCamion={enCamion} alCambiar={recargarVista} abierta={abierta === h.facturaId} alAbrir={() => { setAbierta((actual) => (actual === h.facturaId ? null : h.facturaId)); }} />
            ))}
          </ul>
        </section>
      ) : null}

      {vista.planificada ? <ListaItems titulo="Entregas nuevas sin ordenar" items={vista.nuevas} /> : null}
      {vista.planificada && vista.nuevas.length > 0 && !enCamion ? (
        <Boton disabled={ocupado} onClick={() => { operar({ tipo: 'insertar' }); }}>INSERTAR NUEVAS SIN MOVER LO DEMÁS</Boton>
      ) : null}

      <ListaItems titulo="No se pueden atender" items={vista.noAtendidas}>
        {(i) => vista.noAtendidas.find((n) => n.facturaId === i.facturaId)?.conflictos.map((c) => <span key={c}>{c}</span>)}
      </ListaItems>
      <ListaItems titulo="Sin ubicación (falta el pin del local)" items={vista.sinPin}>
        {(i) => <Link className="tarjeta-enlace" to={`/clientes/${i.localId}`}>FIJAR EL PIN DE {i.cliente}</Link>}
      </ListaItems>
    </>
  );
};

export const PaginaRutas = () => {
  const { api, ahora } = useCasos();
  const { fecha, campos: camposDia } = useDiaDeReparto(ahora);
  const [camionId, setCamionId] = useState('');
  const cargarCamiones = useCallback(() => api.listarCamiones(), [api]);
  const camiones = useCarga(cargarCamiones);
  const lista = useMemo(() => (camiones.estado.tipo === 'ok' ? camiones.estado.datos : []), [camiones.estado]);

  return (
    <Pagina titulo="Rutas del día">
      {camposDia}
      <Selector etiqueta="Camión" value={camionId} onChange={(e) => { setCamionId(e.target.value); }}>
        <option value="">Elige un camión</option>
        {lista.map((c) => <option key={c.id} value={c.id}>{c.alias ? `${c.alias} · ${formatearPatente(c.patente)}` : formatearPatente(c.patente)}</option>)}
      </Selector>
      {camiones.estado.tipo === 'error' ? <ErrorCarga error={camiones.estado.error} alReintentar={camiones.recargar} /> : null}
      {camionId !== '' && fecha !== '' ? <RutaDelCamion key={`${camionId}|${fecha}`} camionId={camionId} fecha={fecha} /> : null}
    </Pagina>
  );
};
