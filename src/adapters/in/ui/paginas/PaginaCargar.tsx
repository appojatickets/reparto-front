import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router';
import { COMUNAS_RM, separarComuna } from '../../../../domain/comunas';
import { horaDeMinutos, minutosDeHora } from '../../../../domain/hora';
import { completarRut, formatearRut } from '../../../../domain/rut';
import { mensajeDeError, mensajesDeDetalle } from '../../../../application/mensajes';
import type { Factura, Jornada, ResultadoBusqueda } from '../../../../application/modelos';
import type { ErrorVoz } from '../../../../application/ports/voz';
import { puedeBuscar } from '../../../../application/use-cases/buscar';
import { useCasos } from '../contexto';
import { useCarga, useDebounced } from '../hooks';
import { AreaTexto, Aviso, Boton, Campo, Cargando, Direccion, ErrorCarga, Insignia, Pagina, Selector } from '../componentes/ui';

const MENSAJE_VOZ: Readonly<Record<ErrorVoz, string>> = {
  PERMISO: 'No hay permiso para usar el micrófono. Actívalo en los ajustes del navegador, o usa el micrófono del teclado.',
  SIN_VOZ: 'No te escuché. Toca HABLAR e intenta de nuevo.',
  RED: 'El dictado necesita internet. Revisa tu señal.',
  OTRO: 'No se pudo usar el micrófono. Intenta de nuevo, o usa el micrófono del teclado.',
};

/** Dictado con el botón propio de la app: lo que se dice va llenando el campo hasta que termina de hablar. */
const useDictado = (alTexto: (t: string) => void, alError: (m: string) => void) => {
  const { voz } = useCasos();
  const [escuchando, setEscuchando] = useState(false);
  const sesion = useRef<{ detener: () => void } | undefined>(undefined);
  const alternar = (): void => {
    if (escuchando) {
      sesion.current?.detener();
      return;
    }
    setEscuchando(true);
    sesion.current = voz.escuchar({
      alTexto: (e) => { alTexto(e.texto); },
      alTerminar: (error) => {
        setEscuchando(false);
        sesion.current = undefined;
        if (error) alError(MENSAJE_VOZ[error]);
      },
    });
  };
  return { disponible: voz.disponible, escuchando, alternar };
};

const BotonHablar = ({ dictado, etiqueta = 'HABLAR' }: { readonly dictado: ReturnType<typeof useDictado>; readonly etiqueta?: string }) =>
  dictado.disponible ? (
    <Boton variante={dictado.escuchando ? 'peligro' : 'primario'} aria-pressed={dictado.escuchando} onClick={dictado.alternar}>
      {dictado.escuchando ? 'ESCUCHANDO… TOCA PARA PARAR' : etiqueta}
    </Boton>
  ) : null;

const Condiciones = ({ f, alGuardar }: { readonly f: Factura; readonly alGuardar: () => void }) => {
  const { api } = useCasos();
  const nombre = f.local.razonSocial;
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
      <Campo etiqueta={`Entregar antes de (${nombre})`} type="time" value={antesDe} onChange={(e) => { setAntesDe(e.target.value); }} />
      <label className="casilla"><input type="checkbox" checked={urgente} onChange={(e) => { setUrgente(e.target.checked); }} /> Urgente</label>
      <AreaTexto etiqueta={`Nota (${nombre})`} value={nota} onChange={(e) => { setNota(e.target.value); }} maxLength={300} />
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      <Boton type="submit" disabled={ocupado}>GUARDAR CONDICIONES</Boton>
    </form>
  );
};

const TarjetaEntrega = ({ f, alCambiar }: { readonly f: Factura; readonly alCambiar: () => void }) => {
  const { api } = useCasos();
  const [abierta, setAbierta] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const quitar = async (): Promise<void> => {
    const r = await api.actualizarFactura(f.id, { estado: 'anulada' });
    if (r.ok) alCambiar();
    else setError(mensajeDeError(r.error));
  };
  return (
    <li className="tarjeta">
      {f.local.razonSocial !== f.local.direccion ? <strong>{f.local.razonSocial}</strong> : null}
      <Direccion direccion={f.local.direccion} comuna={f.local.comuna} />
      <span className="insignias">
        {f.urgente ? <Insignia>URGENTE</Insignia> : null}
        {f.antesDeMin !== undefined ? <Insignia>ANTES DE {horaDeMinutos(f.antesDeMin)}</Insignia> : null}
        {!f.local.tienePin ? <Insignia>SIN UBICACIÓN</Insignia> : null}
      </span>
      {f.nota ? <span>Nota: {f.nota}</span> : null}
      <div className="fila-botones">
        <Boton variante="secundario" aria-expanded={abierta} aria-label={`CONDICIONES ${f.local.razonSocial}`} onClick={() => { setAbierta(!abierta); }}>CONDICIONES</Boton>
        <Boton variante="peligro" aria-label={`QUITAR ${f.local.razonSocial}`} onClick={() => void quitar()}>QUITAR</Boton>
      </div>
      {abierta ? <Condiciones f={f} alGuardar={() => { setAbierta(false); alCambiar(); }} /> : null}
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </li>
  );
};

/**
 * «No lo encuentro»: se crea el cliente con lo mínimo (dirección y comuna; el nombre del local es opcional) y se carga la entrega.
 * Si no hay nombre, el local se llama como su dirección y cualquiera puede completarlo después. El pin se fija al llegar.
 */
const ClienteNuevo = ({ direccionInicial, comunaInicial, alCrear, alCancelar }: { readonly direccionInicial: string; readonly comunaInicial: string; readonly alCrear: (c: { localId: string; razonSocial: string }) => void; readonly alCancelar: () => void }) => {
  const { api } = useCasos();
  const [direccion, setDireccion] = useState(direccionInicial);
  const [comuna, setComuna] = useState(comunaInicial);
  const [nombre, setNombre] = useState('');
  const [rutEscrito, setRutEscrito] = useState('');
  const [errores, setErrores] = useState<readonly string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const dictarDireccion = useDictado(setDireccion, (m) => { setErrores([m]); });
  const dictarNombre = useDictado(setNombre, (m) => { setErrores([m]); });

  const guardar = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    setErrores([]);
    if (direccion.trim() === '' || comuna === '') {
      setErrores(['Falta la dirección o la comuna.']);
      return;
    }
    const rut = rutEscrito.trim() === '' ? undefined : completarRut(rutEscrito);
    if (rutEscrito.trim() !== '' && rut === undefined) {
      setErrores(['El RUT no es válido. Revisa los números.']);
      return;
    }
    const razonSocial = nombre.trim() === '' ? direccion.trim() : nombre.trim();
    setOcupado(true);
    const r = await api.crearCliente({ razonSocial, direccion: direccion.trim(), comuna, ...(rut !== undefined ? { rut } : {}) });
    setOcupado(false);
    if (r.ok) alCrear({ localId: r.value.localId, razonSocial });
    else {
      const detalle = mensajesDeDetalle(r.error);
      setErrores(detalle.length > 0 ? detalle : [mensajeDeError(r.error)]);
    }
  };

  return (
    <form className="tarjeta pagina" aria-label="Cliente nuevo" onSubmit={(e) => void guardar(e)} noValidate>
      <h2>Cliente nuevo</h2>
      <Campo etiqueta="Dirección" ayuda="Calle y número. Ejemplo: Av. Colón 765." value={direccion} onChange={(e) => { setDireccion(e.target.value); }} autoComplete="off" />
      <BotonHablar dictado={dictarDireccion} etiqueta="DICTAR DIRECCIÓN" />
      <Selector etiqueta="Comuna" value={comuna} onChange={(e) => { setComuna(e.target.value); }}>
        <option value="">Elige la comuna</option>
        {COMUNAS_RM.map((c) => <option key={c} value={c}>{c}</option>)}
      </Selector>
      <Campo etiqueta="Nombre del local (opcional)" ayuda="Si lo sabes. Si no, se guarda con la dirección." value={nombre} onChange={(e) => { setNombre(e.target.value); }} autoComplete="off" />
      <BotonHablar dictado={dictarNombre} etiqueta="DICTAR NOMBRE" />
      <Campo etiqueta="RUT (opcional)" ayuda="Solo los números. El RUT no cambia: sirve para reconocer al cliente en todas sus direcciones." inputMode="numeric" value={rutEscrito} onChange={(e) => { setRutEscrito(e.target.value); }} autoComplete="off" />
      {rutEscrito.trim() !== '' && completarRut(rutEscrito) !== undefined ? <p role="status">RUT {formatearRut(completarRut(rutEscrito) ?? '')}</p> : null}
      {errores.length > 0 ? <Aviso tipo="error">{errores.join(' ')}</Aviso> : null}
      <Boton type="submit" disabled={ocupado}>{ocupado ? 'GUARDANDO…' : 'GUARDAR Y CARGAR'}</Boton>
      <Boton variante="secundario" onClick={alCancelar}>CANCELAR</Boton>
    </form>
  );
};

const Carga = ({ jornada }: { readonly jornada: Jornada }) => {
  const { api } = useCasos();
  const [texto, setTexto] = useState('');
  const consulta = useDebounced(texto, 250);
  const [resultados, setResultados] = useState<{ consulta: string; lista: readonly ResultadoBusqueda[]; error?: string } | undefined>();
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'exito'; texto: string } | undefined>();
  const [ocupado, setOcupado] = useState(false);
  const [repetida, setRepetida] = useState<{ localId: string; razonSocial: string } | undefined>();
  const [creando, setCreando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const dictado = useDictado(setTexto, (m) => { setAviso({ tipo: 'error', texto: m }); });

  const cargarLista = useCallback(() => api.listarFacturas({ fecha: jornada.fecha }), [api, jornada.fecha]);
  const lista = useCarga(cargarLista);
  const facturas = lista.estado.tipo === 'ok' ? lista.estado.datos : [];

  useEffect(() => {
    const { consulta: direccion, comuna } = separarComuna(consulta);
    if (!puedeBuscar(direccion)) return;
    const control = new AbortController();
    void api.buscarClientes(direccion, { limite: 6, signal: control.signal, ...(comuna ? { comuna } : {}) }).then((r) => {
      if (control.signal.aborted) return;
      setResultados(r.ok ? { consulta, lista: r.value } : { consulta, lista: [], error: mensajeDeError(r.error) });
    });
    return () => { control.abort(); };
  }, [api, consulta]);

  const escrito = useMemo(() => separarComuna(texto), [texto]);
  const buscando = puedeBuscar(escrito.consulta);
  const actual = buscando && resultados?.consulta === consulta && consulta === texto ? resultados : undefined;

  const cargar = async (c: { localId: string; razonSocial: string }): Promise<void> => {
    setOcupado(true);
    setAviso(undefined);
    setRepetida(undefined);
    const r = await api.registrarFactura({ localId: c.localId, camionId: jornada.camion.id, fecha: jornada.fecha });
    setOcupado(false);
    if (!r.ok) {
      setAviso({ tipo: 'error', texto: mensajeDeError(r.error) });
      return;
    }
    setAviso({ tipo: 'exito', texto: `Cargado: ${c.razonSocial}.` });
    setTexto('');
    setResultados(undefined);
    setCreando(false);
    lista.refrescar();
    campo.current?.focus();
  };

  /** Si ese cliente ya está cargado hoy, se pregunta antes de cargar otra entrega. */
  const elegir = (c: ResultadoBusqueda): void => {
    if (facturas.some((f) => f.local.id === c.localId)) setRepetida({ localId: c.localId, razonSocial: c.razonSocial });
    else void cargar(c);
  };

  return (
    <>
      <Campo
        ref={campo}
        etiqueta="Dirección o cliente"
        ayuda={`Dicta o escribe la dirección con la comuna al final (Av. Colón 765 San Bernardo), el nombre del cliente o su RUT (solo números).${dictado.disponible ? '' : ' Para dictar usa el micrófono del teclado.'}`}
        type="text"
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setCreando(false); }}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus
      />
      <BotonHablar dictado={dictado} />
      {escrito.comuna ? <p role="status">Comuna: <strong className="comuna">{escrito.comuna}</strong></p> : null}
      {buscando && !actual ? <Cargando texto="Buscando…" /> : null}
      {actual?.error ? <Aviso tipo="error">{actual.error}</Aviso> : null}
      {actual && !actual.error && actual.lista.length === 0 ? <Aviso>No encuentro ese cliente.</Aviso> : null}
      {actual && actual.lista.length > 0 ? (
        <>
          <p role="status">Toca el cliente correcto para cargarlo:</p>
          <ul className="tarjetas">
            {actual.lista.map((c) => (
              <li key={c.localId}>
                <button type="button" className="tarjeta tarjeta-boton" disabled={ocupado} onClick={() => { elegir(c); }}>
                  {c.razonSocial !== c.direccion ? <strong>{c.razonSocial}</strong> : null}
                  <Direccion direccion={c.direccion} comuna={c.comuna} />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {repetida ? (
        <div className="tarjeta">
          <Aviso>Ya cargaste a {repetida.razonSocial} hoy. ¿Cargar otra entrega para el mismo cliente?</Aviso>
          <div className="fila-botones">
            <Boton disabled={ocupado} onClick={() => void cargar(repetida)}>CARGAR OTRA</Boton>
            <Boton variante="secundario" onClick={() => { setRepetida(undefined); }}>NO</Boton>
          </div>
        </div>
      ) : null}
      {texto.trim() !== '' && !creando ? <Boton variante="secundario" onClick={() => { setCreando(true); }}>NO LO ENCUENTRO: AGREGAR CLIENTE NUEVO</Boton> : null}
      {creando ? <ClienteNuevo direccionInicial={escrito.consulta} comunaInicial={escrito.comuna ?? ''} alCrear={(c) => void cargar(c)} alCancelar={() => { setCreando(false); }} /> : null}
      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}

      <h2>Cargadas hoy ({facturas.length})</h2>
      {facturas.length > 0 ? <Link className="big-button big-button--primario" to="/mi-ruta">CALCULAR MI RUTA</Link> : null}
      {lista.estado.tipo === 'cargando' ? <Cargando /> : null}
      {lista.estado.tipo === 'error' ? <ErrorCarga error={lista.estado.error} alReintentar={lista.recargar} /> : null}
      {lista.estado.tipo === 'ok' && facturas.length === 0 ? <Aviso>Aún no cargas ninguna entrega hoy.</Aviso> : null}
      <ul className="tarjetas">{facturas.map((f) => <TarjetaEntrega key={f.id} f={f} alCambiar={lista.refrescar} />)}</ul>
    </>
  );
};

export const PaginaCargar = () => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.miJornada(), [api]);
  const { estado, recargar } = useCarga(cargar);
  return (
    <Pagina titulo="Cargar entregas">
      {estado.tipo === 'cargando' ? <Cargando /> : null}
      {estado.tipo === 'error' ? <ErrorCarga error={estado.error} alReintentar={recargar} /> : null}
      {estado.tipo === 'ok' && !estado.datos ? <Aviso tipo="error">Primero elige el camión que manejas hoy. <Link to="/">Ir al inicio</Link></Aviso> : null}
      {estado.tipo === 'ok' && estado.datos ? <Carga jornada={estado.datos} /> : null}
    </Pagina>
  );
};
