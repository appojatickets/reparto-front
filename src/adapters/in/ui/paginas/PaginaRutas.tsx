import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { horaDeMinutos, horaDelDia, minutosDeHora } from '../../../../domain/hora';
import { textoMotivos } from '../../../../domain/motivos';
import { formatearPatente } from '../../../../domain/patente';
import { mensajeDeError } from '../../../../application/mensajes';
import type { ItemRuta, OperacionRuta, ParadaDeRuta, VistaRuta } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { useDiaDeReparto } from '../componentes/dia';
import { Aviso, Boton, Campo, Cargando, ErrorCarga, Insignia, Pagina, Selector } from '../componentes/ui';

const Etiquetas = ({ i }: { readonly i: ItemRuta }) => (
  <span className="insignias">
    {i.urgente ? <Insignia>URGENTE</Insignia> : null}
    {i.antesDeMin !== undefined ? <Insignia>ANTES DE {horaDeMinutos(i.antesDeMin)}</Insignia> : null}
  </span>
);

const TarjetaParada = ({ p, total, ocupado, operar }: { readonly p: ParadaDeRuta; readonly total: number; readonly ocupado: boolean; readonly operar: (o: OperacionRuta) => void }) => {
  const [mas, setMas] = useState(false);
  const motivos = textoMotivos(p.motivos);
  return (
    <li className="tarjeta" aria-label={`Parada ${p.posicion + 1}`}>
      <strong>{p.posicion + 1}. {p.cliente}</strong>
      <span>{p.direccion}, {p.comuna}</span>
      <span>Llega a las <strong>{horaDelDia(p.llegada)}</strong>{p.espera > 0.5 ? ` (espera ${Math.round(p.espera)} min a que abra)` : ''} · {p.folio ? ` · Factura ${p.folio}` : ''}</span>
      <Etiquetas i={p} />
      {p.atraso > 0.5 ? <Insignia>LLEGA {Math.round(p.atraso)} MIN TARDE</Insignia> : null}
      {p.fijada ? <Insignia>FIJADA AL INICIO</Insignia> : null}
      {p.nota ? <span>Nota: {p.nota}</span> : null}
      {motivos !== '' ? <span className="ayuda">{motivos}</span> : null}
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
    </li>
  );
};

const Resumen = ({ v }: { readonly v: VistaRuta }) => (
  <div className="tarjeta" aria-label="Resumen de la ruta">
    <span>Salida: <strong>{horaDelDia(v.salidaMin)}</strong> · Paradas: <strong>{v.paradas.length}</strong></span>
    {v.regreso !== undefined ? <span>Regreso estimado: <strong>{horaDelDia(v.regreso)}</strong></span> : null}
    {v.regresoTardio ? <Aviso tipo="error">El regreso pasa de las {horaDelDia(v.horaLimiteRegresoMin)}. Prueba salir antes, pasar paradas a otro camión o quitar alguna.</Aviso> : null}
    <Insignia>{v.modo === 'manual' ? 'ACOMODADA A MANO' : 'ORDEN SUGERIDO'}</Insignia>
  </div>
);

const ListaItems = ({ titulo, items, children }: { readonly titulo: string; readonly items: readonly ItemRuta[]; readonly children?: (i: ItemRuta) => React.ReactNode }) =>
  items.length === 0 ? null : (
    <section className="pagina" aria-label={titulo}>
      <h2>{titulo} ({items.length})</h2>
      <ul className="tarjetas">
        {items.map((i) => (
          <li key={i.facturaId} className="tarjeta">
            <strong>{i.cliente}</strong>
            <span>{i.direccion}, {i.comuna}{i.folio ? ` · Factura ${i.folio}` : ''}</span>
            <Etiquetas i={i} />
            {children?.(i)}
          </li>
        ))}
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
  const [salidaEscrita, setSalidaEscrita] = useState<string | undefined>();

  const vista = actualizada ?? (estado.tipo === 'ok' ? estado.datos : undefined);
  const salida = salidaEscrita ?? (vista ? horaDeMinutos(vista.salidaMin) : '');

  const aplicar = async (llamada: () => ReturnType<typeof api.planificarRuta>): Promise<void> => {
    setOcupado(true);
    setAviso(undefined);
    setConfirmar(false);
    const r = await llamada();
    setOcupado(false);
    if (r.ok) {
      setActualizada(r.value);
      setSalidaEscrita(undefined);
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
  const cambiarSalida = (): void => {
    const m = minutosDeHora(salida);
    if (m === undefined) {
      setAviso('La hora de salida no es válida.');
      return;
    }
    operar({ tipo: 'salida', salidaMin: m });
  };

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
          <Aviso>Esta ruta aún no está calculada. {vista.nuevas.length === 0 ? 'No hay facturas asignadas a este camión ese día.' : `Hay ${vista.nuevas.length} facturas por ordenar.`}</Aviso>
          <Boton disabled={ocupado || vista.nuevas.length === 0} onClick={() => void planificar()}>{ocupado ? 'CALCULANDO…' : 'CALCULAR RUTA SUGERIDA'}</Boton>
        </>
      ) : (
        <>
          <Resumen v={vista} />
          <div className="pagina">
            <Campo etiqueta="Hora de salida de esta ruta" type="time" value={salida} onChange={(e) => { setSalidaEscrita(e.target.value); }} />
            <Boton variante="secundario" disabled={ocupado} onClick={cambiarSalida}>CAMBIAR SALIDA</Boton>
          </div>
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
          <ol className="tarjetas" aria-label="Paradas en orden">
            {vista.paradas.map((p) => <TarjetaParada key={p.facturaId} p={p} total={vista.paradas.length} ocupado={ocupado} operar={operar} />)}
          </ol>
        </>
      )}

      {vista.enRiesgo.length > 0 ? (
        <section className="pagina" aria-label="Paradas en riesgo">
          <h2>En riesgo de llegar tarde ({vista.enRiesgo.length})</h2>
          <ul className="tarjetas">
            {vista.enRiesgo.map((r) => (
              <li key={r.facturaId} className="tarjeta">
                <strong>{r.cliente}</strong>
                <span>Cierra a las {horaDelDia(r.cierre)}</span>
                {r.conflictos.map((c) => <span key={c}>{c}</span>)}
                {r.sugerencias.map((s) => <Insignia key={s.texto}>{s.texto}</Insignia>)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {vista.planificada ? <ListaItems titulo="Facturas nuevas sin ordenar" items={vista.nuevas} /> : null}
      {vista.planificada && vista.nuevas.length > 0 ? (
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
