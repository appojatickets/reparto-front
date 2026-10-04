import { useCallback, useState, type ChangeEvent, type SyntheticEvent } from 'react';
import { useParams } from 'react-router';
import { leerCoordenadas } from '../../../../domain/coordenadas';
import { enlaceGoogleMaps, enlaceStreetView, enlaceWaze } from '../../../../domain/enlaces';
import { puedeHacer } from '../../../../domain/rol';
import { mensajeDeError } from '../../../../application/mensajes';
import type { LocalDetalle } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { useUsuario } from '../sesion';
import { EditorHorario, ResumenHorario } from '../componentes/EditorHorario';
import { AreaTexto, Aviso, Boton, Campo, Cargando, ErrorCarga, Insignia, Pagina } from '../componentes/ui';
import { ETIQUETA_PIN } from './PaginaClientes';

const FotoLocal = ({ localId, version }: { readonly localId: string; readonly version: number }) => {
  const { api } = useCasos();
  // `version` fuerza una nueva URL firmada después de subir una foto.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cargar = useCallback(() => api.urlFoto(localId), [api, localId, version]);
  const { estado } = useCarga(cargar);
  if (estado.tipo === 'cargando') return <Cargando texto="Cargando foto…" />;
  if (estado.tipo === 'error') return <Aviso tipo="error">{mensajeDeError(estado.error, 'No se pudo cargar la foto.')}</Aviso>;
  return <img className="foto" src={estado.datos.url} alt="Fachada del local" />;
};

const SeccionHorario = ({ localId, editar }: { readonly localId: string; readonly editar: boolean }) => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.obtenerHorario(localId), [api, localId]);
  const { estado, recargar } = useCarga(cargar);
  if (estado.tipo === 'cargando') return <Cargando texto="Cargando horario…" />;
  if (estado.tipo === 'error') return <ErrorCarga error={estado.error} alReintentar={recargar} />;
  if (editar) return <EditorHorario localId={localId} inicial={estado.datos} />;
  return (
    <section className="pagina" aria-label="Horario de atención">
      <h2>Horario de atención</h2>
      <ResumenHorario dias={estado.datos} />
    </section>
  );
};

const PinLocal = ({ local, recargar }: { readonly local: LocalDetalle; readonly recargar: () => void }) => {
  const { api } = useCasos();
  const [texto, setTexto] = useState(local.lat !== undefined && local.lng !== undefined ? `${local.lat}, ${local.lng}` : '');
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | undefined>();
  const [ocupado, setOcupado] = useState(false);
  const guardar = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    const punto = leerCoordenadas(texto);
    if (!punto) {
      setMensaje({ tipo: 'error', texto: 'No entendí las coordenadas. Pega las dos cifras como las copia Google Maps, por ejemplo: -33.4372, -70.6506 (deben estar en la Región Metropolitana).' });
      return;
    }
    setOcupado(true);
    const r = await api.actualizarLocal(local.id, punto);
    setOcupado(false);
    if (r.ok) {
      setMensaje({ tipo: 'exito', texto: 'Ubicación guardada.' });
      recargar();
    } else setMensaje({ tipo: 'error', texto: mensajeDeError(r.error) });
  };
  return (
    <form className="pagina" onSubmit={(e) => void guardar(e)} noValidate>
      <Campo etiqueta="Ubicación del local (pin)" ayuda="En Google Maps toca y mantén el lugar exacto y copia las dos cifras de arriba." value={texto} onChange={(e) => { setTexto(e.target.value); }} autoComplete="off" />
      <Boton type="submit" disabled={ocupado}>GUARDAR UBICACIÓN</Boton>
      {mensaje ? <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso> : null}
    </form>
  );
};

const Detalle = ({ local, recargar }: { readonly local: LocalDetalle; readonly recargar: () => void }) => {
  const { api, subirFotoLocal } = useCasos();
  const usuario = useUsuario();
  const editar = puedeHacer(usuario.rol, 'cliente-nuevo');
  const [nota, setNota] = useState(local.nota ?? '');
  const [rumbo, setRumbo] = useState(local.streetviewRumbo === undefined ? '' : String(local.streetviewRumbo));
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | undefined>();
  const [ocupado, setOcupado] = useState(false);
  const [versionFoto, setVersionFoto] = useState(0);

  const guardar = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    setOcupado(true);
    const cambios = { nota, ...(rumbo.trim() !== '' ? { streetviewRumbo: Number(rumbo) } : {}) };
    const r = await api.actualizarLocal(local.id, cambios);
    setOcupado(false);
    if (r.ok) {
      setMensaje({ tipo: 'exito', texto: 'Cambios guardados.' });
      recargar();
    } else setMensaje({ tipo: 'error', texto: mensajeDeError(r.error) });
  };

  const subir = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setOcupado(true);
    setMensaje({ tipo: 'exito', texto: 'Subiendo foto…' });
    const r = await subirFotoLocal(local.id, archivo);
    setOcupado(false);
    if (r.ok) {
      setMensaje({ tipo: 'exito', texto: 'Foto guardada.' });
      setVersionFoto((v) => v + 1);
      recargar();
    } else setMensaje({ tipo: 'error', texto: r.error });
  };

  const tienePin = local.lat !== undefined && local.lng !== undefined;
  return (
    <Pagina titulo={local.razonSocial}>
      <p>{local.direccion}, <strong>{local.comuna}</strong></p>
      {local.rut ? <p>RUT {local.rut}</p> : null}
      <Insignia>{ETIQUETA_PIN[local.pinEstado]}</Insignia>
      {tienePin ? (
        <div className="fila-botones">
          <a className="big-button big-button--primario" href={enlaceWaze(local.lat ?? 0, local.lng ?? 0)} target="_blank" rel="noreferrer">IR CON WAZE</a>
          <a className="big-button big-button--primario" href={enlaceGoogleMaps(local.lat ?? 0, local.lng ?? 0)} target="_blank" rel="noreferrer">IR CON GOOGLE MAPS</a>
          <a className="big-button big-button--secundario" href={enlaceStreetView(local.lat ?? 0, local.lng ?? 0, local.streetviewRumbo)} target="_blank" rel="noreferrer">VER CALLE (referencia)</a>
        </div>
      ) : <Aviso>Este local todavía no tiene pin.</Aviso>}

      {local.fotoPath ? <FotoLocal localId={local.id} version={versionFoto} /> : <Aviso>Sin foto de la fachada.</Aviso>}
      <div className="campo">
        <label htmlFor="foto">Foto de la fachada (sin personas)</label>
        <input id="foto" type="file" accept="image/*" capture="environment" disabled={ocupado} onChange={(e) => void subir(e)} />
      </div>

      {editar ? (
        <form className="pagina" onSubmit={(e) => void guardar(e)} noValidate>
          <AreaTexto etiqueta="Nota para el chofer" ayuda="Por ejemplo: portón verde, timbre roto." value={nota} onChange={(e) => { setNota(e.target.value); }} maxLength={500} />
          <Campo etiqueta="Rumbo de la calle (0 a 359)" ayuda="Hacia dónde mira la fachada; solo se guarda este número." type="number" inputMode="numeric" min={0} max={359} value={rumbo} onChange={(e) => { setRumbo(e.target.value); }} />
          <Boton type="submit" disabled={ocupado}>GUARDAR</Boton>
        </form>
      ) : null}
      {mensaje ? <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso> : null}
      {editar ? <PinLocal key={`${local.lat ?? ''},${local.lng ?? ''}`} local={local} recargar={recargar} /> : null}
      <SeccionHorario localId={local.id} editar={editar} />
    </Pagina>
  );
};

export const PaginaLocal = () => {
  const { id = '' } = useParams();
  const { api } = useCasos();
  const cargar = useCallback(() => api.obtenerLocal(id), [api, id]);
  const { estado, recargar, refrescar } = useCarga(cargar);
  if (estado.tipo === 'cargando') return <Cargando />;
  if (estado.tipo === 'error') return <ErrorCarga error={estado.error} alReintentar={recargar} />;
  return <Detalle local={estado.datos} recargar={refrescar} />;
};
