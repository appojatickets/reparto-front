import { useCallback, useState, type SyntheticEvent } from 'react';
import { formatearCelular } from '../../../../domain/celular';
import { mensajeDeError } from '../../../../application/mensajes';
import type { Vendedor } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { Aviso, Boton, Campo, Cargando, ErrorCarga, Insignia, Pagina } from '../componentes/ui';

const FormularioNuevo = ({ alCrear }: { readonly alCrear: () => void }) => {
  const { api } = useCasos();
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [creado, setCreado] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    setOcupado(true);
    setError(undefined);
    setCreado(undefined);
    const r = await api.crearVendedor({ codigo, nombre, ...(celular.trim() !== '' ? { celular } : {}) });
    setOcupado(false);
    if (r.ok) {
      setCreado(`${r.value.codigo} ${r.value.nombre}`);
      setCodigo('');
      setNombre('');
      setCelular('');
      alCrear();
    } else setError(mensajeDeError(r.error));
  };

  return (
    <form className="pagina" onSubmit={(e) => void enviar(e)} noValidate>
      <h2>Agregar vendedor</h2>
      <Campo etiqueta="Código" ayuda="Por ejemplo V01." value={codigo} onChange={(e) => { setCodigo(e.target.value); }} autoCapitalize="characters" autoComplete="off" />
      <Campo etiqueta="Nombre" value={nombre} onChange={(e) => { setNombre(e.target.value); }} autoComplete="off" />
      <Campo etiqueta="Celular (opcional)" ayuda="9 dígitos, por ejemplo 9 1234 5678. Con él, el chofer le escribe por WhatsApp con un toque." value={celular} onChange={(e) => { setCelular(e.target.value); }} inputMode="tel" autoComplete="off" />
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      <Boton type="submit" disabled={ocupado}>{ocupado ? 'GUARDANDO…' : 'AGREGAR VENDEDOR'}</Boton>
      {creado ? <Aviso tipo="exito">Vendedor {creado} agregado.</Aviso> : null}
    </form>
  );
};

const Fila = ({ v, alCambiar }: { readonly v: Vendedor; readonly alCambiar: () => void }) => {
  const { api } = useCasos();
  const [error, setError] = useState<string | undefined>();
  const [editando, setEditando] = useState(false);
  const [celular, setCelular] = useState(v.celular ? formatearCelular(v.celular) : '');
  const actualizar = async (cambios: { celular?: string | null; activo?: boolean }): Promise<boolean> => {
    setError(undefined);
    const r = await api.actualizarVendedor(v.id, cambios);
    if (r.ok) alCambiar();
    else setError(mensajeDeError(r.error));
    return r.ok;
  };
  const guardarCelular = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (await actualizar({ celular: celular.trim() === '' ? null : celular })) setEditando(false);
  };
  return (
    <li className="tarjeta">
      <strong>{v.codigo} · {v.nombre}</strong>
      <span>{v.celular ? formatearCelular(v.celular) : 'Sin celular'}</span>
      <Insignia>{v.activo ? 'ACTIVO' : 'INACTIVO'}</Insignia>
      <div className="fila-botones">
        <Boton variante="secundario" aria-expanded={editando} aria-label={`CAMBIAR CELULAR ${v.codigo}`} onClick={() => { setEditando(!editando); }}>CAMBIAR CELULAR</Boton>
        <Boton variante={v.activo ? 'peligro' : 'secundario'} aria-label={`${v.activo ? 'DESACTIVAR' : 'ACTIVAR'} ${v.codigo}`} onClick={() => void actualizar({ activo: !v.activo })}>{v.activo ? 'DESACTIVAR' : 'ACTIVAR'}</Boton>
      </div>
      {editando ? (
        <form className="pagina" onSubmit={(e) => void guardarCelular(e)} noValidate>
          <Campo etiqueta={`Celular de ${v.codigo}`} ayuda="Déjalo vacío para borrarlo." value={celular} onChange={(e) => { setCelular(e.target.value); }} inputMode="tel" autoComplete="off" />
          <Boton type="submit">GUARDAR CELULAR</Boton>
        </form>
      ) : null}
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </li>
  );
};

export const PaginaVendedores = () => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.listarVendedores({ incluirInactivos: true }), [api]);
  const { estado, recargar, refrescar } = useCarga(cargar);
  return (
    <Pagina titulo="Vendedores">
      <FormularioNuevo alCrear={refrescar} />
      <h2>Vendedores</h2>
      {estado.tipo === 'cargando' ? <Cargando /> : null}
      {estado.tipo === 'error' ? <ErrorCarga error={estado.error} alReintentar={recargar} /> : null}
      {estado.tipo === 'ok' && estado.datos.length === 0 ? <Aviso>Aún no hay vendedores. Agrega el primero arriba.</Aviso> : null}
      {estado.tipo === 'ok' ? <ul className="tarjetas">{estado.datos.map((v) => <Fila key={v.id} v={v} alCambiar={refrescar} />)}</ul> : null}
    </Pagina>
  );
};
