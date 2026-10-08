import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { enlaceGoogleMaps } from '../../../../domain/enlaces';
import { describirRespaldo, textoDeQuienVerifico } from '../../../../domain/respaldo-pin';
import { mensajeDeError } from '../../../../application/mensajes';
import type { PinParaRevisar } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { Aviso, Boton, Cargando, ErrorCarga, Insignia, Pagina } from '../componentes/ui';

type Vista = 'por_verificar' | 'verificados';

const FilaPin = ({ p, vista, alCambiar }: { readonly p: PinParaRevisar; readonly vista: Vista; readonly alCambiar: () => void }) => {
  const { api } = useCasos();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const cambiar = async (verificado: boolean): Promise<void> => {
    setOcupado(true);
    setError(undefined);
    const r = await api.verificarPin(p.id, verificado);
    setOcupado(false);
    if (r.ok) alCambiar();
    else setError(mensajeDeError(r.error));
  };
  const respaldo = describirRespaldo(p.respaldo);
  return (
    <li className="tarjeta" aria-label={`Pin de ${p.razonSocial}`}>
      <strong>{p.razonSocial}</strong>
      <span>{p.direccion}, <strong className="comuna">{p.comuna}</strong></span>
      <Insignia>{vista === 'verificados' ? '✓ VERIFICADO' : respaldo.etiqueta}</Insignia>
      <span className="ayuda">{vista === 'verificados' ? textoDeQuienVerifico(p.pinVerificacion) : respaldo.ayuda}</span>
      <div className="fila-botones">
        {vista === 'por_verificar'
          ? <Boton disabled={ocupado} aria-label={`VERIFICAR EL PIN DE ${p.razonSocial}`} onClick={() => void cambiar(true)}>VERIFICAR PIN</Boton>
          : <Boton variante="secundario" disabled={ocupado} aria-label={`QUITAR LA VERIFICACIÓN DE ${p.razonSocial}`} onClick={() => void cambiar(false)}>QUITAR VERIFICACIÓN</Boton>}
        <a className="big-button big-button--secundario" href={enlaceGoogleMaps(p.lat, p.lng)} target="_blank" rel="noreferrer" aria-label={`VER EL PIN DE ${p.razonSocial} EN GOOGLE MAPS`}>VER EN EL MAPA</a>
        <Link className="big-button big-button--secundario" to={`/clientes/${p.id}`}>FICHA</Link>
      </div>
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </li>
  );
};

const Lista = ({ vista }: { readonly vista: Vista }) => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.pinesParaRevisar(vista), [api, vista]);
  const { estado, recargar } = useCarga(cargar);
  if (estado.tipo === 'cargando') return <Cargando />;
  if (estado.tipo === 'error') return <ErrorCarga error={estado.error} alReintentar={recargar} />;
  const { pines, total } = estado.datos;
  if (pines.length === 0) return <Aviso>{vista === 'por_verificar' ? 'No quedan pines por verificar.' : 'Todavía no hay pines verificados.'}</Aviso>;
  return (
    <>
      <p className="ayuda">{total > pines.length ? `Se muestran ${pines.length} de ${total}. Al verificar, entran los siguientes.` : `${total} ${total === 1 ? 'pin' : 'pines'}.`}{vista === 'por_verificar' ? ' Los primeros son los que las entregas ya respaldan: se pueden verificar con confianza.' : ''}</p>
      <ul className="tarjetas">
        {pines.map((p) => <FilaPin key={p.id} p={p} vista={vista} alCambiar={recargar} />)}
      </ul>
    </>
  );
};

/** Verificar pines como se revisan las fotos: dos listas, por verificar y verificados. Un pin verificado ya no se mueve solo. */
export const PaginaVerificarPines = () => {
  const [vista, setVista] = useState<Vista>('por_verificar');
  return (
    <Pagina titulo="Verificar pines">
      <p>Un pin se verifica solo cuando las entregas lo confirman. Aquí revisas los demás: toca VERIFICAR PIN cuando esté bien, o míralo en el mapa antes.</p>
      <div className="fila-botones" role="group" aria-label="Estado">
        <Boton variante={vista === 'por_verificar' ? 'primario' : 'secundario'} aria-pressed={vista === 'por_verificar'} onClick={() => { setVista('por_verificar'); }}>POR VERIFICAR</Boton>
        <Boton variante={vista === 'verificados' ? 'primario' : 'secundario'} aria-pressed={vista === 'verificados'} onClick={() => { setVista('verificados'); }}>VERIFICADOS</Boton>
      </div>
      <Lista key={vista} vista={vista} />
    </Pagina>
  );
};
