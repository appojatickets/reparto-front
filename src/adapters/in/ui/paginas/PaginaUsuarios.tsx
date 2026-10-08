import { useCallback, useState, type SyntheticEvent } from 'react';
import { esDeCamion, type Rol } from '../../../../domain/rol';
import { mensajeDeError } from '../../../../application/mensajes';
import type { UsuarioAdmin } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { useUsuario } from '../sesion';
import { Aviso, Boton, Campo, Cargando, ErrorCarga, Insignia, Pagina, Selector } from '../componentes/ui';

const ROLES: readonly { valor: Rol; texto: string }[] = [
  { valor: 'chofer', texto: 'Chofer' },
  { valor: 'ayudante', texto: 'Ayudante' },
  { valor: 'despachador', texto: 'Despachador' },
  { valor: 'admin', texto: 'Administrador' },
];

const FormularioNuevo = ({ alCrear }: { readonly alCrear: () => void }) => {
  const { api } = useCasos();
  const [f, setF] = useState({ nombre: '', apellidoPaterno: '', apellidoMaterno: '', rol: 'chofer' as Rol, pin: '' });
  const [error, setError] = useState<string | undefined>();
  const [creado, setCreado] = useState<{ username: string; pin: string } | undefined>();
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    setOcupado(true);
    setError(undefined);
    setCreado(undefined);
    const r = await api.crearUsuario({ nombre: f.nombre, apellidoPaterno: f.apellidoPaterno, ...(f.apellidoMaterno.trim() !== '' ? { apellidoMaterno: f.apellidoMaterno } : {}), rol: f.rol, pin: f.pin });
    setOcupado(false);
    if (r.ok) {
      setCreado({ username: r.value.username, pin: f.pin });
      setF({ nombre: '', apellidoPaterno: '', apellidoMaterno: '', rol: 'chofer', pin: '' });
      alCrear();
    } else setError(mensajeDeError(r.error));
  };

  return (
    <form className="pagina" onSubmit={(e) => void enviar(e)} noValidate>
      <h2>Crear usuario</h2>
      <Campo etiqueta="Nombre" value={f.nombre} onChange={(e) => { setF({ ...f, nombre: e.target.value }); }} />
      <Campo etiqueta="Apellido paterno" value={f.apellidoPaterno} onChange={(e) => { setF({ ...f, apellidoPaterno: e.target.value }); }} />
      <Campo etiqueta="Apellido materno (opcional)" value={f.apellidoMaterno} onChange={(e) => { setF({ ...f, apellidoMaterno: e.target.value }); }} />
      <Selector etiqueta="Rol" value={f.rol} onChange={(e) => { setF({ ...f, rol: e.target.value as Rol }); }}>
        {ROLES.map((r) => <option key={r.valor} value={r.valor}>{r.texto}</option>)}
      </Selector>
      <Campo etiqueta="Clave inicial (6 números)" ayuda="No uses 123456 ni números repetidos." value={f.pin} onChange={(e) => { setF({ ...f, pin: e.target.value }); }} inputMode="numeric" autoComplete="off" />
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      <Boton type="submit" disabled={ocupado}>{ocupado ? 'CREANDO…' : 'CREAR USUARIO'}</Boton>
      {creado ? (
        <Aviso tipo="exito">
          Usuario creado. Entrégale estos datos:
          <br /><span className="credencial">Usuario: {creado.username}</span>
          <br /><span className="credencial">Clave: {creado.pin}</span>
        </Aviso>
      ) : null}
    </form>
  );
};

const Fila = ({ u, esYo, alCambiar }: { readonly u: UsuarioAdmin; readonly esYo: boolean; readonly alCambiar: () => void }) => {
  const { api } = useCasos();
  const [abierto, setAbierto] = useState(false);
  const [pin, setPin] = useState('');
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | undefined>();

  const cambiarEstado = async (): Promise<void> => {
    const r = await api.cambiarEstadoUsuario(u.id, !u.activo);
    if (r.ok) alCambiar();
    else setMensaje({ tipo: 'error', texto: mensajeDeError(r.error) });
  };
  const cambiarEditor = async (): Promise<void> => {
    const r = await api.cambiarEditorUsuario(u.id, !u.editor);
    if (r.ok) alCambiar();
    else setMensaje({ tipo: 'error', texto: mensajeDeError(r.error) });
  };
  const resetear = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    const r = await api.resetearPin(u.id, pin);
    if (r.ok) {
      setMensaje({ tipo: 'exito', texto: `Clave cambiada. Nueva clave: ${pin}` });
      setPin('');
      setAbierto(false);
    } else setMensaje({ tipo: 'error', texto: mensajeDeError(r.error) });
  };

  return (
    <li className="tarjeta">
      <strong>{u.nombre}</strong>
      <span>Usuario: {u.username} · {ROLES.find((r) => r.valor === u.rol)?.texto}</span>
      <Insignia>{u.activo ? 'ACTIVO' : 'DESACTIVADO'}</Insignia>
      {u.editor ? <Insignia>EDITOR</Insignia> : null}
      <div className="fila-botones">
        <Boton variante="secundario" onClick={() => { setAbierto(!abierto); }} aria-expanded={abierto}>CAMBIAR CLAVE</Boton>
        {esDeCamion(u.rol) ? <Boton variante="secundario" onClick={() => void cambiarEditor()}>{u.editor ? 'QUITAR PERMISO DE EDITOR' : 'DAR PERMISO DE EDITOR'}</Boton> : null}
        {!esYo ? <Boton variante="peligro" onClick={() => void cambiarEstado()}>{u.activo ? 'DESACTIVAR' : 'ACTIVAR'}</Boton> : null}
      </div>
      {abierto ? (
        <form className="pagina" onSubmit={(e) => void resetear(e)} noValidate>
          <Campo etiqueta={`Nueva clave de ${u.nombre}`} value={pin} onChange={(e) => { setPin(e.target.value); }} inputMode="numeric" autoComplete="off" />
          <Boton type="submit">GUARDAR CLAVE</Boton>
        </form>
      ) : null}
      {mensaje ? <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso> : null}
    </li>
  );
};

export const PaginaUsuarios = () => {
  const { api } = useCasos();
  const yo = useUsuario();
  const cargar = useCallback(() => api.listarUsuarios(), [api]);
  const { estado, recargar } = useCarga(cargar);
  return (
    <Pagina titulo="Usuarios">
      <FormularioNuevo alCrear={recargar} />
      <h2>Usuarios</h2>
      {estado.tipo === 'cargando' ? <Cargando /> : null}
      {estado.tipo === 'error' ? <ErrorCarga error={estado.error} alReintentar={recargar} /> : null}
      {estado.tipo === 'ok' ? <ul className="tarjetas">{estado.datos.map((u) => <Fila key={u.id} u={u} esYo={u.id === yo.id} alCambiar={recargar} />)}</ul> : null}
    </Pagina>
  );
};
