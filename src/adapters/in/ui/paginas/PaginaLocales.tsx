import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { COMUNAS_RM } from '../../../../domain/comunas';
import { lineaEntregado, formatoRut, textoParaCompartir } from '../../../../domain/compartir-local';
import { enlaceVerEnMapa, enlaceWhatsApp } from '../../../../domain/enlaces';
import { puedeHacer } from '../../../../domain/rol';
import { mensajeDeError } from '../../../../application/mensajes';
import type { LocalDeLista } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useCarga, useDebounced } from '../hooks';
import { useUsuario } from '../sesion';
import { compartirNativo, copiarTexto, puedeCompartirNativo } from '../compartir';
import { ImagenFoto } from '../componentes/ImagenFoto';
import { PegarUbicacion } from '../componentes/PegarUbicacion';
import { AreaTexto, Aviso, Boton, Campo, Cargando, ErrorCarga, Insignia, Pagina, Selector } from '../componentes/ui';

const LIMITE = 500;
const LARGO_MINIMO_TEXTO = 2;

type Mensaje = { readonly tipo: 'exito' | 'error' | 'info'; readonly texto: string };

/** Editar todo lo de un local: los datos del cliente (razón social, RUT, giro), la dirección, la nota y el pin. Solo se envía lo que cambió. */
const EditorLocal = ({ l, alGuardar, alCerrar }: { readonly l: LocalDeLista; readonly alGuardar: () => void; readonly alCerrar: () => void }) => {
  const { api } = useCasos();
  const [razon, setRazon] = useState(l.razonSocial);
  const [rut, setRut] = useState(l.rut ?? '');
  const [giro, setGiro] = useState(l.giro ?? '');
  const [direccion, setDireccion] = useState(l.direccion);
  const [comuna, setComuna] = useState(l.comuna);
  const [nota, setNota] = useState(l.nota ?? '');
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | undefined>();

  const cliente = {
    ...(razon.trim() !== l.razonSocial ? { razonSocial: razon } : {}),
    ...(rut.trim() !== (l.rut ?? '') ? { rut } : {}),
    ...(giro.trim() !== (l.giro ?? '') ? { giro } : {}),
  };
  const local = {
    ...(direccion.trim() !== l.direccion ? { direccion } : {}),
    ...(comuna !== l.comuna ? { comuna } : {}),
    ...(nota.trim() !== (l.nota ?? '') ? { nota } : {}),
  };
  const hayCambios = Object.keys(cliente).length > 0 || Object.keys(local).length > 0;

  const guardar = async (): Promise<void> => {
    setOcupado(true);
    setMensaje(undefined);
    if (Object.keys(cliente).length > 0) {
      const r = await api.corregirCliente(l.clienteId, cliente);
      if (!r.ok) {
        setOcupado(false);
        setMensaje({ tipo: 'error', texto: mensajeDeError(r.error) });
        return;
      }
    }
    if (Object.keys(local).length > 0) {
      const r = await api.actualizarLocal(l.localId, local);
      if (!r.ok) {
        setOcupado(false);
        setMensaje({ tipo: 'error', texto: mensajeDeError(r.error) });
        return;
      }
    }
    setOcupado(false);
    alGuardar();
    alCerrar();
  };

  const eliminar = async (): Promise<void> => {
    setOcupado(true);
    const r = await api.eliminarLocal(l.localId);
    setOcupado(false);
    if (r.ok) {
      alGuardar();
      return;
    }
    setConfirmando(false);
    setMensaje({ tipo: 'error', texto: mensajeDeError(r.error) });
  };

  return (
    <div className="pagina" role="form" aria-label={`Editar ${l.razonSocial}`}>
      <Campo etiqueta="Razón social" value={razon} maxLength={200} onChange={(e) => { setRazon(e.target.value); }} />
      <Campo etiqueta="RUT" ayuda="Déjalo vacío para borrarlo." value={rut} maxLength={20} autoCapitalize="characters" onChange={(e) => { setRut(e.target.value); }} />
      <Campo etiqueta="Giro" value={giro} maxLength={100} onChange={(e) => { setGiro(e.target.value); }} />
      <Campo etiqueta="Dirección" value={direccion} maxLength={300} onChange={(e) => { setDireccion(e.target.value); }} />
      <Selector etiqueta="Comuna" value={comuna} onChange={(e) => { setComuna(e.target.value); }}>
        {COMUNAS_RM.map((c) => <option key={c} value={c}>{c}</option>)}
      </Selector>
      <AreaTexto etiqueta="Nota" ayuda="Por ejemplo: portón verde, timbre roto." value={nota} maxLength={500} onChange={(e) => { setNota(e.target.value); }} />
      <Boton disabled={ocupado || !hayCambios} onClick={() => void guardar()}>{ocupado ? 'GUARDANDO…' : 'GUARDAR CAMBIOS'}</Boton>
      {mensaje ? <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso> : null}

      <PegarUbicacion localId={l.localId} etiqueta="Ubicación del pin (pega el enlace de Google Maps o las coordenadas)" textoBoton="GUARDAR UBICACIÓN" alGuardar={alGuardar} />

      {confirmando ? (
        <div className="tarjeta" role="group" aria-label="Confirmar eliminación">
          <Aviso tipo="error">¿Eliminar la dirección «{l.direccion}, {l.comuna}» de {l.razonSocial}? No se puede deshacer.</Aviso>
          <Boton variante="peligro" disabled={ocupado} onClick={() => void eliminar()}>SÍ, ELIMINAR</Boton>
          <Boton variante="secundario" disabled={ocupado} onClick={() => { setConfirmando(false); }}>NO, DEJARLA</Boton>
        </div>
      ) : <Boton variante="peligro" onClick={() => { setMensaje(undefined); setConfirmando(true); }}>ELIMINAR ESTA DIRECCIÓN</Boton>}
      <Boton variante="secundario" onClick={alCerrar}>CERRAR</Boton>
    </div>
  );
};

/** Compartir el local: con el menú del teléfono si lo hay; si no, WhatsApp o copiar el texto. */
const Compartir = ({ l }: { readonly l: LocalDeLista }) => {
  const { api } = useCasos();
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | undefined>();
  const texto = textoParaCompartir(l);

  const compartir = async (): Promise<void> => {
    setMensaje(undefined);
    if (!puedeCompartirNativo()) {
      setAbierto(!abierto);
      return;
    }
    const foto = l.tieneFoto ? await api.urlFoto(l.localId) : undefined;
    const r = await compartirNativo(l.razonSocial, texto, foto?.ok ? foto.value.url : undefined);
    if (r === 'fallo') setAbierto(true);
  };
  const copiar = async (): Promise<void> => {
    setMensaje((await copiarTexto(texto)) ? { tipo: 'exito', texto: 'Texto copiado.' } : { tipo: 'error', texto: 'No se pudo copiar. Mantén apretado el texto para copiarlo.' });
  };

  return (
    <>
      <Boton variante="secundario" aria-expanded={abierto} aria-label={`COMPARTIR ${l.razonSocial}`} onClick={() => void compartir()}>COMPARTIR</Boton>
      {abierto ? (
        <div className="tarjeta" role="group" aria-label={`Compartir ${l.razonSocial}`}>
          <pre className="texto-compartir">{texto}</pre>
          <div className="fila-botones">
            <a className="big-button big-button--primario" href={enlaceWhatsApp(texto)} target="_blank" rel="noreferrer">ENVIAR POR WHATSAPP</a>
            <Boton variante="secundario" onClick={() => void copiar()}>COPIAR EL TEXTO</Boton>
          </div>
          {mensaje ? <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso> : null}
        </div>
      ) : null}
    </>
  );
};

const FilaLocal = ({ l, alCambiar }: { readonly l: LocalDeLista; readonly alCambiar: () => void }) => {
  const { api } = useCasos();
  const usuario = useUsuario();
  const [editando, setEditando] = useState(false);
  const [verFoto, setVerFoto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const tienePin = l.lat !== undefined && l.lng !== undefined;
  const puedeVerificar = puedeHacer(usuario.rol, 'verificar-pines', usuario.editor);

  const verificar = async (verificado: boolean): Promise<void> => {
    setOcupado(true);
    setError(undefined);
    const r = await api.verificarPin(l.localId, verificado);
    setOcupado(false);
    if (r.ok) alCambiar();
    else setError(mensajeDeError(r.error));
  };

  return (
    <li className="tarjeta" aria-label={l.razonSocial}>
      <strong>{l.razonSocial}</strong>
      {l.rut ? <span>RUT {formatoRut(l.rut)}</span> : null}
      {l.giro ? <span className="ayuda">{l.giro}</span> : null}
      <span>{l.direccion}, <strong className="comuna">{l.comuna}</strong></span>
      <Insignia>{!tienePin ? 'SIN PIN' : l.pinVerificado ? '✓ VERIFICADO' : 'PIN POR VERIFICAR'}</Insignia>
      {l.entregas > 0 ? <span>{lineaEntregado(l.entregas, l.recaudado)}</span> : null}
      {l.nota ? <span className="ayuda">Nota: {l.nota}</span> : null}
      {verFoto ? <ImagenFoto localId={l.localId} cliente={l.razonSocial} /> : null}
      <div className="fila-botones">
        {tienePin && puedeVerificar
          ? (l.pinVerificado
            ? <Boton variante="secundario" disabled={ocupado} aria-label={`QUITAR LA VERIFICACIÓN DE ${l.razonSocial}`} onClick={() => void verificar(false)}>QUITAR VERIFICACIÓN</Boton>
            : <Boton disabled={ocupado} aria-label={`VERIFICAR EL PIN DE ${l.razonSocial}`} onClick={() => void verificar(true)}>VERIFICAR PIN</Boton>)
          : null}
        {tienePin ? <a className="big-button big-button--secundario" href={enlaceVerEnMapa(l.lat ?? 0, l.lng ?? 0)} target="_blank" rel="noreferrer" aria-label={`VER EL PIN DE ${l.razonSocial} EN EL MAPA`}>VER EN EL MAPA</a> : null}
        {l.tieneFoto && !verFoto ? <Boton variante="secundario" aria-label={`VER LA FOTO DE ${l.razonSocial}`} onClick={() => { setVerFoto(true); }}>VER FOTO</Boton> : null}
        <Compartir l={l} />
        <Boton variante="secundario" aria-expanded={editando} aria-label={`EDITAR ${l.razonSocial}`} onClick={() => { setEditando(!editando); }}>EDITAR</Boton>
        <Link className="big-button big-button--secundario" to={`/clientes/${l.localId}`}>FICHA</Link>
      </div>
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      {editando ? <EditorLocal l={l} alGuardar={alCambiar} alCerrar={() => { setEditando(false); }} /> : null}
    </li>
  );
};

type Vista = 'por_verificar' | 'verificados';

const Resultados = ({ filtro }: { readonly filtro: { readonly comuna?: string; readonly texto?: string } }) => {
  const { api } = useCasos();
  const [vista, setVista] = useState<Vista>('por_verificar');
  const cargar = useCallback(() => api.listarLocales({ ...filtro, limite: LIMITE }), [api, filtro]);
  const { estado, recargar, refrescar } = useCarga(cargar);
  if (estado.tipo === 'cargando') return <Cargando />;
  if (estado.tipo === 'error') return <ErrorCarga error={estado.error} alReintentar={recargar} />;
  const { total, locales } = estado.datos;
  if (locales.length === 0) return <Aviso>No hay locales con ese filtro.</Aviso>;
  const porVerificar = locales.filter((l) => !l.pinVerificado);
  const verificados = locales.filter((l) => l.pinVerificado);
  const mostrados = vista === 'por_verificar' ? porVerificar : verificados;
  return (
    <>
      <div className="fila-botones" role="group" aria-label="Estado del pin">
        <Boton variante={vista === 'por_verificar' ? 'primario' : 'secundario'} aria-pressed={vista === 'por_verificar'} onClick={() => { setVista('por_verificar'); }}>{`POR VERIFICAR (${porVerificar.length})`}</Boton>
        <Boton variante={vista === 'verificados' ? 'primario' : 'secundario'} aria-pressed={vista === 'verificados'} onClick={() => { setVista('verificados'); }}>{`VERIFICADOS (${verificados.length})`}</Boton>
      </div>
      {total > locales.length ? <Aviso>Se muestran {locales.length} de {total}. Escribe más en el buscador o elige una comuna para ver el resto.</Aviso> : null}
      {mostrados.length === 0
        ? <Aviso>{vista === 'por_verificar' ? 'No quedan locales por verificar aquí.' : 'Todavía no hay locales verificados aquí.'}</Aviso>
        : <ul className="tarjetas">{mostrados.map((l) => <FilaLocal key={l.localId} l={l} alCambiar={refrescar} />)}</ul>}
    </>
  );
};

/**
 * Los locales por comuna, separados en «por verificar» (incluye los sin pin) y «verificados», con buscador por nombre, RUT o dirección.
 * Cada local muestra sus datos, lo entregado, la foto y el pin; se puede compartir y editar todo desde aquí (ADR 0022 del front).
 */
export const PaginaLocales = () => {
  const { api } = useCasos();
  const [comuna, setComuna] = useState('');
  const [texto, setTexto] = useState('');
  const buscado = useDebounced(texto.trim(), 350);
  const cargarResumen = useCallback(() => api.resumenComunas(), [api]);
  const { estado: resumen } = useCarga(cargarResumen);
  const conTexto = buscado.length >= LARGO_MINIMO_TEXTO;
  const filtro = useMemo(() => ({ ...(comuna !== '' ? { comuna } : {}), ...(conTexto ? { texto: buscado } : {}) }), [comuna, conTexto, buscado]);
  const hayFiltro = comuna !== '' || conTexto;

  return (
    <Pagina titulo="Locales por comuna">
      <Campo etiqueta="Buscar por nombre, RUT o dirección" type="search" value={texto} autoComplete="off" onChange={(e) => { setTexto(e.target.value); }} />
      <Selector etiqueta="Comuna" value={comuna} onChange={(e) => { setComuna(e.target.value); }}>
        <option value="">{conTexto ? 'Todas las comunas' : 'Elige la comuna'}</option>
        {resumen.tipo === 'ok'
          ? resumen.datos.map((c) => <option key={c.comuna} value={c.comuna}>{`${c.comuna} · ${c.total} ${c.total === 1 ? 'local' : 'locales'}${c.sinPin > 0 ? ` · ${c.sinPin} sin pin` : ''}`}</option>)
          : null}
      </Selector>
      {hayFiltro ? <Resultados key={`${comuna}|${buscado}`} filtro={filtro} /> : <Aviso>Elige una comuna o busca por nombre, RUT o dirección.</Aviso>}
    </Pagina>
  );
};
