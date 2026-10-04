import { useCallback, useState, type SyntheticEvent } from 'react';
import { formatearPatente } from '../../../../domain/patente';
import { mensajeDeError } from '../../../../application/mensajes';
import type { Camion } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { Aviso, Boton, Campo, Cargando, ErrorCarga, Insignia, Pagina } from '../componentes/ui';

const FormularioNuevo = ({ alCrear }: { readonly alCrear: () => void }) => {
  const { api } = useCasos();
  const [patente, setPatente] = useState('');
  const [alias, setAlias] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [creado, setCreado] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    setOcupado(true);
    setError(undefined);
    setCreado(undefined);
    const r = await api.crearCamion({ patente, ...(alias.trim() !== '' ? { alias } : {}) });
    setOcupado(false);
    if (r.ok) {
      setCreado(formatearPatente(r.value.patente));
      setPatente('');
      setAlias('');
      alCrear();
    } else setError(mensajeDeError(r.error));
  };

  return (
    <form className="pagina" onSubmit={(e) => void enviar(e)} noValidate>
      <h2>Agregar camión</h2>
      <Campo etiqueta="Patente" ayuda="Por ejemplo AB 1234 o BCDF 12." value={patente} onChange={(e) => { setPatente(e.target.value); }} autoCapitalize="characters" autoComplete="off" />
      <Campo etiqueta="Nombre del camión (opcional)" ayuda="Por ejemplo «Camión 3» o «el blanco»." value={alias} onChange={(e) => { setAlias(e.target.value); }} autoComplete="off" />
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      <Boton type="submit" disabled={ocupado}>{ocupado ? 'GUARDANDO…' : 'AGREGAR CAMIÓN'}</Boton>
      {creado ? <Aviso tipo="exito">Camión {creado} agregado.</Aviso> : null}
    </form>
  );
};

const Fila = ({ c, alCambiar }: { readonly c: Camion; readonly alCambiar: () => void }) => {
  const { api } = useCasos();
  const [error, setError] = useState<string | undefined>();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(c.alias ?? '');
  const cambiar = async (): Promise<void> => {
    const r = await api.actualizarCamion(c.id, { activo: !c.activo });
    if (r.ok) alCambiar();
    else setError(mensajeDeError(r.error));
  };
  const guardarNombre = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    setError(undefined);
    const r = await api.actualizarCamion(c.id, { alias: nombre.trim() === '' ? null : nombre.trim() });
    if (r.ok) {
      setEditando(false);
      alCambiar();
    } else setError(mensajeDeError(r.error));
  };
  return (
    <li className="tarjeta">
      <strong>{formatearPatente(c.patente)}</strong>
      {c.alias ? <span>{c.alias}</span> : null}
      <Insignia>{c.activo ? 'ACTIVO' : 'FUERA DE SERVICIO'}</Insignia>
      <div className="fila-botones">
        <Boton variante="secundario" aria-expanded={editando} aria-label={`CAMBIAR NOMBRE ${formatearPatente(c.patente)}`} onClick={() => { setEditando(!editando); }}>CAMBIAR NOMBRE</Boton>
        <Boton variante={c.activo ? 'peligro' : 'secundario'} onClick={() => void cambiar()}>{c.activo ? 'SACAR DE SERVICIO' : 'VOLVER A ACTIVAR'}</Boton>
      </div>
      {editando ? (
        <form className="pagina" onSubmit={(e) => void guardarNombre(e)} noValidate>
          <Campo etiqueta={`Nombre del camión ${formatearPatente(c.patente)}`} value={nombre} onChange={(e) => { setNombre(e.target.value); }} autoComplete="off" />
          <Boton type="submit">GUARDAR NOMBRE</Boton>
        </form>
      ) : null}
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </li>
  );
};

export const PaginaCamiones = () => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.listarCamiones({ incluirInactivos: true }), [api]);
  const { estado, recargar, refrescar } = useCarga(cargar);
  return (
    <Pagina titulo="Camiones">
      <FormularioNuevo alCrear={refrescar} />
      <h2>Camiones</h2>
      {estado.tipo === 'cargando' ? <Cargando /> : null}
      {estado.tipo === 'error' ? <ErrorCarga error={estado.error} alReintentar={recargar} /> : null}
      {estado.tipo === 'ok' && estado.datos.length === 0 ? <Aviso>Aún no hay camiones. Agrega el primero arriba.</Aviso> : null}
      {estado.tipo === 'ok' ? <ul className="tarjetas">{estado.datos.map((c) => <Fila key={c.id} c={c} alCambiar={refrescar} />)}</ul> : null}
    </Pagina>
  );
};
