import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { reordenarParadas } from '../../../../domain/arrastre';
import { enlaceNavegar, enlaceRutaGoogleMaps } from '../../../../domain/enlaces';
import { horaDeMinutos } from '../../../../domain/hora';
import { textoMotivos } from '../../../../domain/motivos';
import { formatearPatente } from '../../../../domain/patente';
import { llegoAlDeposito } from '../../../../domain/deposito';
import { esDeCamion, puedeEditar, puedeHacer } from '../../../../domain/rol';
import { mismoTexto } from '../../../../domain/texto';
import { mensajeDeError } from '../../../../application/mensajes';
import type { Armado } from '../../../../application/ports/armado-store';
import type { ItemRuta, OperacionRuta, ParadaDeRuta, ResumenJornada, VistaRuta } from '../../../../application/modelos';
import { useArrastre } from '../arrastre';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { AccionesParada, AtajoCerrado, AtajoEntregado, AtajoIr } from '../componentes/AccionesParada';
import { FotoFachada } from '../componentes/FotoFachada';
import { InsigniasDeVerificacion } from '../componentes/InsigniasDeVerificacion';
import { useDiaDeReparto } from '../componentes/dia';
import { useUsuario } from '../sesion';
import { Aviso, Boton, Cargando, Direccion, ErrorCarga, Insignia, Pagina, Selector } from '../componentes/ui';

const REFRESCO_MS = 3 * 60 * 1000;
/** Cada cuánto se mira si el camión ya llegó al depósito (solo con la pantalla abierta y después de haber entregado algo). */
const MIRAR_DEPOSITO_MS = 90 * 1000;

const Etiquetas = ({ i }: { readonly i: ItemRuta }) => (
  <span className="insignias">
    {i.urgente ? <Insignia>URGENTE</Insignia> : null}
    {i.antesDeMin !== undefined ? <Insignia>ANTES DE {horaDeMinutos(i.antesDeMin)}</Insignia> : null}
  </span>
);

/**
 * Qué pasa con una parada que no tiene ubicación precisa y qué hacer: la ruta la ubica por estimación, así que conviene ajustarla. Se fija
 * sola al marcar ENTREGADO con buen GPS, o antes si se pega la ubicación del vendedor.
 */
const AvisoUbicacion = ({ p, puedeAbrirFicha }: { readonly p: ParadaDeRuta; readonly puedeAbrirFicha: boolean }) => {
  const sinPin = p.lat === undefined || p.lng === undefined;
  const como = puedeAbrirFicha
    ? <>Recomendado: ajústala con <Link to={`/clientes/${p.localId}`}>Fijar el pin</Link> o pega la ubicación del vendedor.</>
    : <>Recomendado: pega la ubicación del vendedor con el botón UBICACIÓN DEL VENDEDOR.</>;
  if (!sinPin) {
    return <span className="ayuda">Ubicación aproximada: te guía por la dirección. Al llegar, tu GPS la mejora. {como}</span>;
  }
  return (
    <span className="ayuda">
      {p.noEncontradaEnMapa ? 'No se encontró esta dirección en el mapa y no tiene pin: ' : 'Todavía no tiene pin: se está buscando en el mapa. '}
      la ruta la ubica por estimación, sin ubicación precisa. {como} Si no, el pin se fija solo al marcar ENTREGADO en la puerta.
    </span>
  );
};

/** Cuántas paradas de la ruta están ubicadas por estimación (sin pin o con pin aproximado), para que se note y se ajusten. */
const AvisoAproximadas = ({ paradas }: { readonly paradas: readonly ParadaDeRuta[] }) => {
  const n = paradas.filter((p) => p.ubicacionAproximada).length;
  if (n === 0) return null;
  return (
    <Aviso>
      {n === 1 ? '1 parada sin ubicación precisa' : `${n} paradas sin ubicación precisa`}: la ruta {n === 1 ? 'la ubica' : 'las ubica'} por estimación (van marcadas en naranja). Se ajustan al marcar ENTREGADO en la puerta, o antes pegando la ubicación del vendedor.
    </Aviso>
  );
};

/**
 * Una fila de la lista de paradas: número, nombre y comuna (y a qué hora llega). Al tocarla se despliega con el resto de los datos y las
 * acciones; así el chofer ve toda su ruta de un vistazo y solo abre la parada que le toca.
 */
const FilaParada = ({ p, total, ocupado, operar, mover, asa, fila, enCamion, alCambiar, alFijarPin, abierta, alAbrir, esSiguiente }: {
  readonly p: ParadaDeRuta; readonly total: number; readonly ocupado: boolean; readonly operar: (o: OperacionRuta) => void; readonly enCamion: boolean;
  /** Deja esta parada en la posición indicada (lo mismo que arrastrarla). */
  readonly mover: (posicion: number) => void;
  /** Eventos del asa para arrastrar y cómo se dibuja la fila mientras alguna se arrastra. */
  readonly asa: ReturnType<ReturnType<typeof useArrastre>['asa']>; readonly fila: { readonly clase: string; readonly estilo?: CSSProperties };
  readonly alCambiar: () => void; readonly alFijarPin: (cliente: string) => void; readonly abierta: boolean; readonly alAbrir: () => void; readonly esSiguiente: boolean;
}) => {
  const [mas, setMas] = useState(false);
  const usuario = useUsuario();
  const motivos = textoMotivos(p.motivos);
  const n = p.posicion + 1;
  const idDetalle = `parada-${p.facturaId}`;
  return (
    <li className={`parada${esSiguiente ? ' parada--siguiente' : ''}${p.ubicacionAproximada ? ' parada--aproximada' : ''}${fila.clase}`} style={fila.estilo} aria-label={`Parada ${n}`}>
      <button type="button" className="parada-fila" aria-expanded={abierta} aria-controls={idDetalle} onClick={alAbrir}>
        <span className="parada-num" aria-hidden="true">{n}</span>
        <span className="parada-nombre">
          <strong>{p.cliente}</strong>
          <span className="comuna">{p.comuna}</span>
          {esSiguiente ? <span className="parada-marca">SIGUIENTE</span> : null}
          {p.urgente ? <span className="parada-marca">URGENTE</span> : null}
          {p.ubicacionAproximada ? <span className="parada-marca parada-marca--aproximada">SIN UBICACIÓN PRECISA</span> : null}
          <InsigniasDeVerificacion pin={p.pinVerificado} foto={p.fotoVerificada} />
        </span>
      </button>
      <div className="parada-atajos">
        <Boton
          variante="secundario"
          className="atajo asa"
          disabled={ocupado || total < 2}
          aria-label={`MOVER ${p.cliente}`}
          title="Mantén presionado y arrastra. Con el teclado, usa las flechas ↑ ↓."
          {...asa}
          onKeyDown={(e) => {
            const destino = e.key === 'ArrowUp' ? p.posicion - 1 : e.key === 'ArrowDown' ? p.posicion + 1 : undefined;
            if (destino === undefined) return;
            e.preventDefault();
            if (destino >= 0 && destino < total) mover(destino);
          }}
        >
          <span aria-hidden="true">↕</span> MOVER
        </Boton>
        {enCamion ? <AtajoEntregado p={p} alCambiar={alCambiar} alFijarPin={() => { alFijarPin(p.cliente); }} /> : null}
        {enCamion ? <AtajoCerrado p={p} alCambiar={alCambiar} alPosponer={() => { operar({ tipo: 'despues', facturaId: p.facturaId }); }} /> : null}
        {enCamion ? <AtajoIr p={p} /> : null}
      </div>
      {abierta ? (
        <div className="parada-detalle" id={idDetalle}>
          {!mismoTexto(p.cliente, p.direccion) ? <Direccion direccion={p.direccion} comuna={p.comuna} /> : null}
          <FotoFachada localId={p.localId} cliente={p.cliente} tieneFoto={p.tieneFoto === true} conPin={p.lat !== undefined && p.lng !== undefined} />
          {p.folio ? <span>Factura {p.folio}</span> : null}
          <Etiquetas i={p} />
          {p.fijada ? <Insignia>FIJADA AL INICIO</Insignia> : null}
          {p.ubicacionAproximada ? <AvisoUbicacion p={p} puedeAbrirFicha={puedeHacer(usuario.rol, 'buscar-clientes', usuario.editor)} /> : null}
          {p.nota ? <span>Nota: {p.nota}</span> : null}
          {motivos !== '' ? <span className="ayuda">{motivos}</span> : null}
          {puedeEditar(usuario.rol, usuario.editor) ? <Link className="big-button big-button--secundario" to={`/clientes/${p.localId}`} aria-label={`CORREGIR ESTA DIRECCIÓN ${p.cliente}`}>CORREGIR ESTA DIRECCIÓN</Link> : null}
          {enCamion ? <AccionesParada p={p} alCambiar={alCambiar} alFijarPin={() => { alFijarPin(p.cliente); }} alPosponer={() => { operar({ tipo: 'despues', facturaId: p.facturaId }); }} /> : null}
          <div className="fila-botones">
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
    <Insignia>{v.modo === 'manual' ? 'AUTOMÁTICO · ACOMODADA A MANO' : v.modo === 'carga' ? 'ORDEN MANUAL' : 'ORDEN AUTOMÁTICO'}</Insignia>
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

/**
 * La última parada de toda ruta: volver a la empresa (el depósito configurado). Está anclada: no se mueve ni se entrega, solo marca adónde se
 * vuelve y a qué hora se llega. Al hacer la última entrega se destaca: ya no queda nada y es hora de volver.
 */
const FilaDeposito = ({ v, enCamion }: { readonly v: VistaRuta; readonly enCamion: boolean }) => {
  const deposito = v.deposito;
  if (!deposito || !v.planificada || (v.paradas.length === 0 && v.hechas.length === 0)) return null;
  const nombre = deposito.nombre?.trim() ? deposito.nombre.trim().toUpperCase() : 'LA EMPRESA';
  const terminaste = v.paradas.length === 0;
  const destino = { direccion: deposito.nombre ?? 'Depósito', comuna: '', lat: deposito.lat, lng: deposito.lng };
  return (
    <div className={`parada parada--deposito${terminaste ? ' parada--deposito-final' : ''}`} aria-label="Volver a la empresa">
      <div className="parada-fila parada-fila--fija">
        <span className="parada-num" aria-hidden="true">⌂</span>
        <span className="parada-nombre">
          {terminaste ? <strong>Terminaste las entregas</strong> : null}
          <strong>{terminaste ? `VUELVE A ${nombre}` : `VOLVER A ${nombre}`}</strong>
          <span className="comuna">{v.regreso !== undefined && !terminaste ? `Llegada estimada ${horaDeMinutos(v.regreso)} · ` : ''}Última parada: no se mueve</span>
        </span>
      </div>
      {enCamion ? (
        <div className="parada-atajos">
          <a className="big-button big-button--primario atajo" href={enlaceNavegar(destino, 'google')} target="_blank" rel="noreferrer" aria-label={`IR A ${nombre} CON GOOGLE MAPS`}>IR</a>
          <a className="big-button big-button--secundario atajo" href={enlaceNavegar(destino, 'waze')} target="_blank" rel="noreferrer" aria-label={`IR A ${nombre} CON WAZE`}>WAZE</a>
        </div>
      ) : null}
    </div>
  );
};

/** Todo el estado de UN camión y día vive aquí: al cambiar de camión o de día se vuelve a montar y parte limpio. */
export const RutaDelCamion = ({ camionId, fecha }: { readonly camionId: string; readonly fecha: string }) => {
  const { api, ubicacion, armado: armadoStore } = useCasos();
  const cargar = useCallback(() => api.verRuta(camionId, fecha), [api, camionId, fecha]);
  const { estado, recargar, refrescar } = useCarga(cargar);
  const [actualizada, setActualizada] = useState<VistaRuta | undefined>();
  const [aviso, setAviso] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  /** Pidió pasar a «las agrego en orden» con una ruta que acomodó a mano: se le avisa antes de descartarla. */
  const [confirmarCarga, setConfirmarCarga] = useState(false);
  /** Parada desplegada: sin elegir, la siguiente; `null` = todas cerradas. */
  const [abierta, setAbierta] = useState<string | null | undefined>(undefined);
  const { rol } = useUsuario();
  const enCamion = esDeCamion(rol);
  /** Cómo prefiere armar su ruta el chofer (se recuerda en el teléfono); sin elegir, la primera vez se le pregunta. */
  const [preferencia, setPreferencia] = useState<Armado | undefined>(() => armadoStore.cargar());
  const elegirPreferencia = (a: Armado): void => {
    armadoStore.guardar(a);
    setPreferencia(a);
  };
  /** Después de entregar o avisar: se vuelve a pedir la ruta (la parada hecha sale de la lista y las horas se corren). */
  const recargarVista = (): void => {
    setActualizada(undefined);
    refrescar();
  };

  const vista = actualizada ?? (estado.tipo === 'ok' ? estado.datos : undefined);

  const aplicar = async (llamada: () => ReturnType<typeof api.planificarRuta>, alFallar?: () => void): Promise<void> => {
    setOcupado(true);
    setAviso(undefined);
    setConfirmar(false);
    setConfirmarCarga(false);
    const r = await llamada();
    setOcupado(false);
    if (r.ok) {
      setActualizada(r.value);
      return;
    }
    alFallar?.();
    setAviso(mensajeDeError(r.error));
    if (r.error.codigo === 'RUTA_DESACTUALIZADA' || r.error.status === 409) {
      setActualizada(undefined);
      refrescar();
    }
  };

  /** `carga` arma la ruta en el orden en que se cargaron las facturas; sin indicar, el chofer usa su preferencia y los demás la calculan. */
  const planificar = (armado: Armado | undefined = enCamion ? preferencia : undefined): Promise<void> =>
    aplicar(() => (armado === 'carga' ? api.planificarRuta(camionId, fecha, undefined, 'carga') : api.planificarRuta(camionId, fecha)));
  const operar = (operacion: OperacionRuta): void => {
    const version = vista?.version;
    if (version === undefined) return;
    void aplicar(() => api.operarRuta(camionId, fecha, version, operacion));
  };
  /** PASAR A MANUAL: se congela el orden que se ve; desde ahí nada se reordena solo. Es lo que el chofer prefiere desde entonces. */
  const pasarAManual = (): void => {
    elegirPreferencia('carga');
    operar({ tipo: 'fijar' });
  };
  /** Volver a AUTOMÁTICO: el sistema ordena lo que queda (se pide confirmar porque cambia el orden que la persona dejó). */
  const [confirmarAutomatico, setConfirmarAutomatico] = useState(false);
  const pasarAAutomatico = (): void => {
    setConfirmarAutomatico(false);
    elegirPreferencia('calcular');
    operar({ tipo: 'ordenar' });
  };
  /** Aviso de lo último que se movió, para quien no ve la lista (lector de pantalla) y como confirmación. */
  const [anuncio, setAnuncio] = useState<string | undefined>();
  /**
   * Arrastrar y soltar (o las flechas del asa): la parada queda en su lugar de inmediato y el servidor lo confirma y recalcula las horas.
   * Si no se pudo, vuelve a donde estaba y se avisa.
   */
  const mover = (facturaId: string, posicion: number): void => {
    const v = vista;
    const version = v?.version;
    const parada = v?.paradas.find((p) => p.facturaId === facturaId);
    if (!v || version === undefined || !parada || ocupado) return;
    const anterior = actualizada;
    const paradas = reordenarParadas(v.paradas, facturaId, posicion);
    setActualizada({ ...v, paradas });
    setAnuncio(`${parada.cliente} quedó en el lugar ${(paradas.find((p) => p.facturaId === facturaId)?.posicion ?? posicion) + 1}.`);
    void aplicar(
      () => api.operarRuta(camionId, fecha, version, { tipo: 'mover', facturaId, posicion }),
      () => { setActualizada(anterior); setAnuncio(undefined); },
    );
  };
  const lista = useRef<HTMLOListElement>(null);
  const arrastre = useArrastre(lista, vista?.paradas.map((p) => p.facturaId) ?? [], mover);
  // Terminar la ruta: con el botón de abajo o al llegar al depósito. El servidor limpia la lista al instante (borra la ruta y suelta lo pendiente del camión).
  const [terminada, setTerminada] = useState<{ readonly resumen: ResumenJornada | null } | undefined>();
  const [confirmandoFin, setConfirmandoFin] = useState(false);
  const [terminando, setTerminando] = useState(false);
  const [errorFin, setErrorFin] = useState<string | undefined>();
  const [llegoAlDep, setLlegoAlDep] = useState(false);
  const [avisoDescartado, setAvisoDescartado] = useState(false);
  const pendientes = vista ? vista.paradas.length + vista.nuevas.length + vista.sinPin.length + vista.noAtendidas.length : 0;
  const terminarRuta = async (): Promise<void> => {
    setTerminando(true);
    setErrorFin(undefined);
    const r = await api.terminarRuta();
    setTerminando(false);
    if (r.ok) setTerminada({ resumen: r.value });
    else setErrorFin(mensajeDeError(r.error));
  };

  /** Mientras la pantalla está abierta y ya se entregó algo, se lee el GPS de vez en cuando solo para comparar con el depósito (no se envía ni se guarda). */
  const deposito = vista?.deposito;
  const hizoEntregas = (vista?.hechas.length ?? 0) > 0;
  useEffect(() => {
    if (!enCamion || !deposito || !hizoEntregas || terminada || !ubicacion.disponible) return;
    let activo = true;
    const mirar = async (): Promise<void> => {
      if (document.visibilityState !== 'visible') return;
      const u = await ubicacion.actual();
      if (activo && u.ok && llegoAlDeposito(u.value, deposito)) setLlegoAlDep(true);
    };
    void mirar();
    const cada = setInterval(() => { void mirar(); }, MIRAR_DEPOSITO_MS);
    return () => {
      activo = false;
      clearInterval(cada);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cambia si cambia el depósito o si ya hubo entregas
  }, [enCamion, deposito?.lat, deposito?.lng, hizoEntregas, terminada, ubicacion]);

  /** Llegó al depósito y no queda nada por entregar: la ruta termina sola. */
  const terminoSola = useRef(false);
  useEffect(() => {
    if (!llegoAlDep || pendientes > 0 || terminada || terminando || terminoSola.current) return;
    terminoSola.current = true;
    void terminarRuta();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una sola vez, cuando se cumple la condición
  }, [llegoAlDep, pendientes, terminada, terminando]);

  /** Elegir por cuál se empieza: esa parada queda primera y el resto se vuelve a ordenar desde ahí (también si la ruta estaba acomodada a mano). */
  const elegirPrimera = (facturaId: string): void => {
    const version = vista?.version;
    if (version === undefined || facturaId === '') return;
    // El servidor deja esa parada primera y ordena solo lo de abajo, también en una ruta acomodada a mano (ADR 0029 del back).
    void aplicar(() => api.operarRuta(camionId, fecha, version, { tipo: 'primero', facturaId }));
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
  const hayQueOrdenar = enCamion && preferencia !== undefined && vista !== undefined && !vista.planificada && vista.nuevas.length > 0;
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
    // En una ruta acomodada a mano o en el orden de carga, lo nuevo entra sin mover lo demás.
    operar({ tipo: vista?.modo === 'manual' || vista?.modo === 'carga' ? 'insertar' : 'ordenar' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se integra una vez por cada grupo de entregas nuevas
  }, [nuevasSinIntegrar, ocupado]);

  if (estado.tipo === 'cargando' && !vista) return <Cargando />;
  if (estado.tipo === 'error') {
    const e = estado.error;
    const sinDeposito = e.kind === 'HTTP' && e.status === 422 && JSON.stringify(e.detalle ?? '').includes('SIN_DEPOSITO');
    return sinDeposito ? <Aviso tipo="error">Falta configurar el depósito. <Link to="/admin/configuracion">Ir a la configuración</Link></Aviso> : <ErrorCarga error={e} alReintentar={recargar} />;
  }
  if (!vista) return null;

  if (terminada) {
    const r = terminada.resumen;
    return (
      <section className="pagina" aria-label="Ruta terminada">
        <Aviso tipo="exito">Ruta terminada. ¡Buen trabajo!</Aviso>
        {r ? (
          <div className="tarjeta">
            <span>Entregadas: <strong>{r.entregadas}</strong></span>
            <span>No entregadas: <strong>{r.noEntregadas}</strong></span>
            <span>Sin hacer: <strong>{r.pendientes}</strong></span>
          </div>
        ) : null}
        {(r?.pendientes ?? 0) > 0 ? <Aviso>La lista quedó limpia. Lo que no se alcanzó a entregar volvió a «Facturas del día» sin camión; mañana la ruta se arma de cero.</Aviso> : null}
        <Link className="big-button big-button--primario" to="/">VOLVER AL INICIO</Link>
      </section>
    );
  }

  return (
    <>
      {enCamion && llegoAlDep && pendientes > 0 && !avisoDescartado ? (
        <div className="tarjeta" role="status" aria-label="Llegaste al depósito">
          <strong>Llegaste al depósito. ¿Terminaste la ruta?</strong>
          <span>Quedan {pendientes} entregas sin hacer: si terminas, la lista se limpia y esas entregas vuelven a «Facturas del día» sin camión.</span>
          <div className="fila-botones">
            <Boton disabled={terminando} onClick={() => void terminarRuta()}>SÍ, TERMINAR LA RUTA</Boton>
            <Boton variante="secundario" onClick={() => { setAvisoDescartado(true); }}>NO, SIGO</Boton>
          </div>
        </div>
      ) : null}
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
          {enCamion && preferencia === undefined && vista.nuevas.length > 0 ? (
            <div className="tarjeta" role="group" aria-label="Cómo armar tu ruta">
              <strong>¿Cómo armo tu ruta?</strong>
              <span>Lo recuerdo para la próxima vez y lo puedes cambiar cuando quieras.</span>
              <Boton disabled={ocupado} onClick={() => { elegirPreferencia('calcular'); void planificar('calcular'); }}>CALCULAR MI RUTA</Boton>
              <p className="ayuda">Ruta automática: el sistema la ordena según cercanía, horarios y prioridades.</p>
              <Boton variante="secundario" disabled={ocupado} onClick={() => { elegirPreferencia('carga'); void planificar('carga'); }}>LAS AGREGO EN ORDEN</Boton>
              <p className="ayuda">Ruta manual: si te sabes el recorrido, va en el orden en que cargues las facturas y nada se mueve solo. Lo que haces queda guardado para que el sistema aprenda de tu experiencia.</p>
            </div>
          ) : (
            <>
              <Boton disabled={ocupado || vista.nuevas.length === 0} onClick={() => void planificar(enCamion ? undefined : 'calcular')}>{ocupado ? 'CALCULANDO…' : 'CALCULAR RUTA SUGERIDA'}</Boton>
              {enCamion ? null : <Boton variante="secundario" disabled={ocupado || vista.nuevas.length === 0} onClick={() => void planificar('carga')}>ARMARLA EN EL ORDEN DE CARGA</Boton>}
            </>
          )}
        </>
      ) : (
        <>
          <Resumen v={vista} />
          {enCamion && vista.paradas.length > 0 ? <a className="big-button big-button--secundario" href={enlaceRutaGoogleMaps(vista.paradas.map((x) => ({ direccion: x.direccion, comuna: x.comuna, lat: x.lat, lng: x.lng }))) ?? '#'} target="_blank" rel="noreferrer">LAS PRÓXIMAS {Math.min(vista.paradas.length, 9)} EN GOOGLE MAPS</a> : null}
          {vista.paradas.length >= 2 && vista.modo !== 'carga' ? (
            <Selector etiqueta="Primera entrega (el resto se ordena desde ahí)" value="" disabled={ocupado} onChange={(e) => { elegirPrimera(e.target.value); }}>
              <option value="">Elige por cuál empiezas…</option>
              {vista.paradas.map((p) => <option key={p.facturaId} value={p.facturaId}>{`${p.posicion + 1}. ${p.cliente} · ${p.comuna}`}</option>)}
            </Selector>
          ) : null}
          <div className="tarjeta" role="group" aria-label="Orden de la ruta">
            <strong>Orden de la ruta</strong>
            <div className="fila-botones">
              <Boton variante={vista.modo === 'carga' ? 'secundario' : 'primario'} aria-pressed={vista.modo !== 'carga'} disabled={ocupado} onClick={() => { if (vista.modo === 'carga') setConfirmarAutomatico(true); }}>AUTOMÁTICO</Boton>
              <Boton variante={vista.modo === 'carga' ? 'primario' : 'secundario'} aria-pressed={vista.modo === 'carga'} disabled={ocupado} onClick={() => { if (vista.modo !== 'carga') pasarAManual(); }}>MANUAL</Boton>
            </div>
            <span className="ayuda">
              {vista.modo === 'carga'
                ? 'Manual: la ruta va como tú la dejaste y nada se mueve solo. Lo que cargues después entra al final. Si un local está cerrado y lo dejas para más tarde, baja de lugar.'
                : 'Automático: el sistema ordena lo que queda cada vez que algo cambia. Toca MANUAL para congelar el orden que ves y moverlo tú.'}
            </span>
            {confirmarAutomatico ? (
              <>
                <Aviso tipo="error">El sistema volverá a ordenar lo que queda y puede cambiar el orden que dejaste.</Aviso>
                <div className="fila-botones">
                  <Boton variante="peligro" disabled={ocupado} onClick={pasarAAutomatico}>SÍ, ORDENAR AUTOMÁTICO</Boton>
                  <Boton variante="secundario" onClick={() => { setConfirmarAutomatico(false); }}>NO, DEJARLA MANUAL</Boton>
                </div>
              </>
            ) : null}
            {vista.modo === 'carga' ? <Boton variante="secundario" disabled={ocupado} onClick={() => { setConfirmarCarga(true); }}>VOLVER AL ORDEN EN QUE CARGUÉ</Boton> : null}
            {confirmarCarga ? (
              <>
                <Aviso tipo="error">Esto descarta lo que acomodaste y deja la ruta en el orden en que cargaste las facturas.</Aviso>
                <div className="fila-botones">
                  <Boton variante="peligro" disabled={ocupado} onClick={() => { elegirPreferencia('carga'); void planificar('carga'); }}>SÍ, EN MI ORDEN DE CARGA</Boton>
                  <Boton variante="secundario" onClick={() => { setConfirmarCarga(false); }}>NO, DEJARLA</Boton>
                </div>
              </>
            ) : null}
          </div>
          {vista.modo !== 'carga' ? <Boton variante="secundario" disabled={ocupado || vista.paradas.length < 2} onClick={() => { elegirPreferencia('calcular'); operar({ tipo: 'ordenar' }); }}>ORDENAR LO QUE QUEDA</Boton> : null}
          {vista.modo === 'carga' ? null : !confirmar ? (
            <Boton variante="secundario" disabled={ocupado} onClick={() => { setConfirmar(true); }}>VOLVER A CALCULAR DESDE CERO</Boton>
          ) : (
            <div className="tarjeta">
              <Aviso tipo="error">Esto descarta el orden actual{vista.modo === 'manual' ? ', incluido lo que acomodaste a mano' : ''} y calcula uno nuevo.</Aviso>
              <div className="fila-botones">
                <Boton variante="peligro" disabled={ocupado} onClick={() => void planificar('calcular')}>SÍ, RECALCULAR</Boton>
                <Boton variante="secundario" onClick={() => { setConfirmar(false); }}>NO, DEJARLA</Boton>
              </div>
            </div>
          )}

          {vista.paradas.length === 0 ? <Aviso>Ninguna parada se pudo ubicar en la ruta.</Aviso> : null}
          <AvisoAproximadas paradas={vista.paradas} />
          <p role="status" className="ayuda">Toca una parada para ver sus datos y acciones. Para cambiar el orden, mantén presionado MOVER y arrastra la parada: al soltarla queda en ese lugar.</p>
          {anuncio ? <p role="status" className="ayuda">{anuncio}</p> : null}
          <ol ref={lista} className={`paradas${arrastre.arrastrando ? ' paradas--arrastrando' : ''}`} aria-label="Paradas en orden">
            {vista.paradas.map((p, i) => (
              <FilaParada
                key={p.facturaId}
                p={p}
                total={vista.paradas.length}
                ocupado={ocupado}
                operar={operar}
                mover={(posicion) => { mover(p.facturaId, posicion); }}
                asa={arrastre.asa(p.facturaId)}
                fila={arrastre.fila(i)}
                enCamion={enCamion}
                alCambiar={recargarVista}
                alFijarPin={(cliente) => { setAnuncio(`La ubicación de ${cliente} quedó guardada con tu GPS.`); }}
                esSiguiente={i === 0}
                abierta={(abierta ?? vista.paradas[0]?.facturaId) === p.facturaId}
                alAbrir={() => { setAbierta((actual) => ((actual ?? vista.paradas[0]?.facturaId) === p.facturaId ? null : p.facturaId)); }}
              />
            ))}
          </ol>
          <FilaDeposito v={vista} enCamion={enCamion} />
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

      {enCamion && (vista.hechas.length > 0 || pendientes > 0) ? (
        <section className="pagina" aria-label="Terminar la ruta">
          {!confirmandoFin ? (
            <Boton variante="secundario" disabled={terminando} onClick={() => { if (pendientes > 0) setConfirmandoFin(true); else void terminarRuta(); }}>{terminando ? 'TERMINANDO…' : 'TERMINAR RUTA'}</Boton>
          ) : (
            <div className="tarjeta">
              <Aviso tipo="error">Quedan {pendientes} entregas sin hacer. Si terminas, la lista se limpia y esas entregas vuelven a «Facturas del día» sin camión.</Aviso>
              <div className="fila-botones">
                <Boton variante="peligro" disabled={terminando} onClick={() => void terminarRuta()}>SÍ, TERMINAR</Boton>
                <Boton variante="secundario" onClick={() => { setConfirmandoFin(false); }}>NO, SEGUIR</Boton>
              </div>
            </div>
          )}
          {errorFin ? <Aviso tipo="error">{errorFin}</Aviso> : null}
        </section>
      ) : null}
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
