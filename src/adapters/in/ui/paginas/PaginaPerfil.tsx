import { useRef, useState, type ChangeEvent } from 'react';
import { ETIQUETA_ROL } from '../../../../domain/rol';
import { Avatar } from '../componentes/Avatar';
import { Aviso, Boton, Pagina } from '../componentes/ui';
import { useCasos } from '../contexto';
import { useSesion, useUsuario } from '../sesion';

/** Mi perfil: quién soy y mi foto (se ve junto a mi nombre en la app). Cualquiera puede poner, cambiar o quitar la suya. */
export const PaginaPerfil = () => {
  const usuario = useUsuario();
  const { cambiarFoto } = useSesion();
  const { subirFotoPerfil, quitarFotoPerfil } = useCasos();
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | undefined>();
  const entrada = useRef<HTMLInputElement>(null);

  const subir = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setOcupado(true);
    setMensaje(undefined);
    const r = await subirFotoPerfil(archivo);
    setOcupado(false);
    if (r.ok) {
      cambiarFoto(r.value);
      setMensaje({ tipo: 'exito', texto: 'Listo: tu foto ya se ve junto a tu nombre.' });
    } else setMensaje({ tipo: 'error', texto: r.error });
  };

  const quitar = async (): Promise<void> => {
    setOcupado(true);
    const r = await quitarFotoPerfil();
    setOcupado(false);
    setConfirmando(false);
    if (r.ok) {
      cambiarFoto(undefined);
      setMensaje({ tipo: 'exito', texto: 'Tu foto se quitó.' });
    } else setMensaje({ tipo: 'error', texto: r.error });
  };

  return (
    <Pagina titulo="Mi perfil">
      <div className="perfil">
        <Avatar usuarioId={usuario.id} nombre={usuario.nombre} fotoEn={usuario.fotoEn} tamano="grande" />
        <div className="perfil-datos">
          <strong>{usuario.nombre}</strong>
          <span>Usuario: {usuario.username}</span>
          <span>{ETIQUETA_ROL[usuario.rol]}</span>
        </div>
      </div>
      <input ref={entrada} type="file" accept="image/*" hidden onChange={(e) => void subir(e)} aria-label="Elegir mi foto" />
      <Boton variante={usuario.fotoEn !== undefined ? 'secundario' : 'primario'} disabled={ocupado} onClick={() => { entrada.current?.click(); }}>
        {ocupado && !confirmando ? 'SUBIENDO FOTO…' : usuario.fotoEn !== undefined ? 'CAMBIAR MI FOTO' : 'SUBIR MI FOTO'}
      </Boton>
      {usuario.fotoEn !== undefined && !confirmando ? <Boton variante="secundario" disabled={ocupado} onClick={() => { setConfirmando(true); }}>QUITAR MI FOTO</Boton> : null}
      {confirmando ? (
        <div className="pagina" role="group" aria-label="Confirmar quitar la foto">
          <Aviso tipo="error">¿Quitar tu foto? Volverán a verse tus iniciales.</Aviso>
          <Boton variante="peligro" disabled={ocupado} onClick={() => void quitar()}>SÍ, QUITARLA</Boton>
          <Boton variante="secundario" disabled={ocupado} onClick={() => { setConfirmando(false); }}>NO, DEJARLA</Boton>
        </div>
      ) : null}
      <p className="ayuda">Elige una foto tuya (de la galería o toma una). Se recorta en cuadrado. La ven las personas de tu empresa dentro de la app.</p>
      {mensaje ? <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso> : null}
    </Pagina>
  );
};
