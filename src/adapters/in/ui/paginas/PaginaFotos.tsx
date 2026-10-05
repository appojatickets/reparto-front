import { useCallback, useState } from 'react';
import { fechaYHoraEnChile, textoDeMotivo } from '../../../../domain/foto-reporte';
import { mensajeDeError } from '../../../../application/mensajes';
import type { FotoReciente, ReporteFoto } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { ImagenFoto } from '../componentes/ImagenFoto';
import { Aviso, Boton, Cargando, ErrorCarga, Pagina } from '../componentes/ui';

const quienYCuando = (por: string | undefined, cuando: string | undefined): string => {
  const fecha = fechaYHoraEnChile(cuando);
  if (por === undefined && fecha === '') return 'No se sabe quién la subió (es anterior a este panel).';
  return `Subió ${por ?? 'alguien'}${fecha !== '' ? ` el ${fecha}` : ''}.`;
};

/** Eliminar la foto de un local: pide confirmar en el mismo lugar (es del administrador y no se puede deshacer). */
const BotonesEliminar = ({ cliente, ocupado, alEliminar, alDejar }: { readonly cliente: string; readonly ocupado: boolean; readonly alEliminar: () => void; readonly alDejar?: () => void }) => {
  const [confirmando, setConfirmando] = useState(false);
  if (confirmando) {
    return (
      <div className="fila-botones">
        <Boton variante="peligro" disabled={ocupado} aria-label={`SÍ, ELIMINAR LA FOTO DE ${cliente}`} onClick={alEliminar}>SÍ, ELIMINAR</Boton>
        <Boton variante="secundario" onClick={() => { setConfirmando(false); }}>NO</Boton>
      </div>
    );
  }
  return (
    <div className="fila-botones">
      <Boton variante="peligro" disabled={ocupado} aria-label={`ELIMINAR LA FOTO DE ${cliente}`} onClick={() => { setConfirmando(true); }}>ELIMINAR LA FOTO</Boton>
      {alDejar ? <Boton variante="secundario" disabled={ocupado} aria-label={`LA FOTO DE ${cliente} ESTÁ BIEN`} onClick={alDejar}>LA FOTO ESTÁ BIEN</Boton> : null}
    </div>
  );
};

const FilaReportada = ({ r, alCambiar }: { readonly r: ReporteFoto; readonly alCambiar: () => void }) => {
  const { api } = useCasos();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const resolver = async (accion: 'eliminar' | 'descartar'): Promise<void> => {
    setOcupado(true);
    setError(undefined);
    const x = await api.resolverReporteFoto(r.id, accion);
    setOcupado(false);
    if (x.ok) alCambiar();
    else setError(mensajeDeError(x.error));
  };
  return (
    <li className="tarjeta" aria-label={`Foto reportada de ${r.razonSocial}`}>
      <ImagenFoto localId={r.localId} cliente={r.razonSocial} />
      <strong>{r.razonSocial}</strong>
      <span>{r.direccion}, <strong className="comuna">{r.comuna}</strong></span>
      <span>Reportada: <strong>{textoDeMotivo(r.motivo)}</strong>{r.detalle ? ` · «${r.detalle}»` : ''}</span>
      <span className="ayuda">Reportó {r.reportadoPor ?? 'alguien'}{fechaYHoraEnChile(r.reportadoEn) !== '' ? ` el ${fechaYHoraEnChile(r.reportadoEn)}` : ''}. {quienYCuando(r.subidaPor, r.subidaEn)}</span>
      <BotonesEliminar cliente={r.razonSocial} ocupado={ocupado} alEliminar={() => void resolver('eliminar')} alDejar={() => void resolver('descartar')} />
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </li>
  );
};

const FilaReciente = ({ f, alCambiar }: { readonly f: FotoReciente; readonly alCambiar: () => void }) => {
  const { api } = useCasos();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const eliminar = async (): Promise<void> => {
    setOcupado(true);
    setError(undefined);
    const x = await api.quitarFoto(f.localId);
    setOcupado(false);
    if (x.ok) alCambiar();
    else setError(mensajeDeError(x.error));
  };
  return (
    <li className="tarjeta" aria-label={`Foto reciente de ${f.razonSocial}`}>
      <ImagenFoto localId={f.localId} cliente={f.razonSocial} />
      <strong>{f.razonSocial}</strong>
      <span>{f.direccion}, <strong className="comuna">{f.comuna}</strong></span>
      <span className="ayuda">{quienYCuando(f.subidaPor, f.subidaEn)}</span>
      <BotonesEliminar cliente={f.razonSocial} ocupado={ocupado} alEliminar={() => void eliminar()} />
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </li>
  );
};

/** Panel del admin para revisar fotos: las que reportó el equipo y las subidas hace poco, con quién y cuándo. */
export const PaginaFotos = () => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.fotosParaRevision(), [api]);
  const { estado, recargar, refrescar } = useCarga(cargar);
  return (
    <Pagina titulo="Revisar fotos">
      <p>Aquí ves las fotos que el equipo reportó y las que se subieron hace poco. Si una está mal (no es la fachada, se ven personas, está borrosa), elimínala: el local queda sin foto y alguien la vuelve a tomar.</p>
      {estado.tipo === 'cargando' ? <Cargando /> : null}
      {estado.tipo === 'error' ? <ErrorCarga error={estado.error} alReintentar={recargar} /> : null}
      {estado.tipo === 'ok' ? (
        <>
          <h2>Reportadas ({estado.datos.reportadas.length})</h2>
          {estado.datos.reportadas.length === 0 ? <Aviso tipo="exito">No hay fotos reportadas por revisar.</Aviso> : (
            <ul className="tarjetas">{estado.datos.reportadas.map((r) => <FilaReportada key={r.id} r={r} alCambiar={refrescar} />)}</ul>
          )}
          <h2>Subidas hace poco ({estado.datos.recientes.length})</h2>
          {estado.datos.recientes.length === 0 ? <Aviso>Todavía no hay fotos subidas.</Aviso> : (
            <ul className="tarjetas">{estado.datos.recientes.map((f) => <FilaReciente key={f.localId} f={f} alCambiar={refrescar} />)}</ul>
          )}
        </>
      ) : null}
    </Pagina>
  );
};
