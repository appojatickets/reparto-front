import { useCallback, useState } from 'react';
import { fechaYHoraEnChile, textoDeMotivo } from '../../../../domain/foto-reporte';
import { mensajeDeError } from '../../../../application/mensajes';
import type { ApiError } from '../../../../application/ports/api-client';
import type { Result } from '../../../../domain/result';
import type { FotoSubida, FotoVerificada, ReporteFoto } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { ImagenFoto } from '../componentes/ImagenFoto';
import { Aviso, Boton, Cargando, ErrorCarga, Pagina } from '../componentes/ui';

const quienYCuando = (por: string | undefined, cuando: string | undefined): string => {
  const fecha = fechaYHoraEnChile(cuando);
  if (por === undefined && fecha === '') return 'No se sabe quién la subió (es anterior a este panel).';
  return `Subió ${por ?? 'alguien'}${fecha !== '' ? ` el ${fecha}` : ''}.`;
};

type AccionDejar = { readonly texto: string; readonly etiqueta: string; readonly variante?: 'primario' | 'secundario'; readonly alTocar: () => void };

/** Eliminar la foto de un local: pide confirmar en el mismo lugar (es del administrador y no se puede deshacer). `dejar` es la otra salida: dar la foto por buena. */
const BotonesEliminar = ({ cliente, ocupado, alEliminar, dejar }: { readonly cliente: string; readonly ocupado: boolean; readonly alEliminar: () => void; readonly dejar?: AccionDejar }) => {
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
      {dejar ? <Boton variante={dejar.variante ?? 'secundario'} disabled={ocupado} aria-label={dejar.etiqueta} onClick={dejar.alTocar}>{dejar.texto}</Boton> : null}
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
      {r.fotoReemplazada ? null : <ImagenFoto localId={r.localId} cliente={r.razonSocial} />}
      <strong>{r.razonSocial}</strong>
      <span>{r.direccion}, <strong className="comuna">{r.comuna}</strong></span>
      <span>Reportada: <strong>{textoDeMotivo(r.motivo)}</strong>{r.detalle ? ` · «${r.detalle}»` : ''}</span>
      <span className="ayuda">Reportó {r.reportadoPor ?? 'alguien'}{fechaYHoraEnChile(r.reportadoEn) !== '' ? ` el ${fechaYHoraEnChile(r.reportadoEn)}` : ''}. {quienYCuando(r.subidaPor, r.subidaEn)}</span>
      {r.fotoReemplazada ? (
        <>
          <Aviso>Esta foto ya fue reemplazada o eliminada. Si hay una foto nueva, aparece en «Por verificar».</Aviso>
          <div className="fila-botones">
            <Boton variante="secundario" disabled={ocupado} aria-label={`CERRAR EL REPORTE DE ${r.razonSocial}`} onClick={() => void resolver('descartar')}>CERRAR EL REPORTE</Boton>
          </div>
        </>
      ) : (
        <BotonesEliminar cliente={r.razonSocial} ocupado={ocupado} alEliminar={() => void resolver('eliminar')} dejar={{ texto: 'LA FOTO ESTÁ BIEN', etiqueta: `LA FOTO DE ${r.razonSocial} ESTÁ BIEN`, alTocar: () => void resolver('descartar') }} />
      )}
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </li>
  );
};

/** Acciones sobre la foto de una fila (eliminar, verificar, devolver): al terminar se vuelve a leer la lista, y también si respondió 409 porque la foto cambió. */
const useAccionesDeFoto = (alCambiar: () => void) => {
  const { api } = useCasos();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const ejecutar = async (accion: () => Promise<Result<void, ApiError>>): Promise<void> => {
    setOcupado(true);
    setError(undefined);
    const x = await accion();
    setOcupado(false);
    if (x.ok) alCambiar();
    else {
      setError(mensajeDeError(x.error));
      if (x.error.kind === 'HTTP' && x.error.status === 409) alCambiar();
    }
  };
  return { api, ocupado, error, ejecutar };
};

const FilaPorVerificar = ({ f, alCambiar }: { readonly f: FotoSubida; readonly alCambiar: () => void }) => {
  const { api, ocupado, error, ejecutar } = useAccionesDeFoto(alCambiar);
  return (
    <li className="tarjeta" aria-label={`Foto por verificar de ${f.razonSocial}`}>
      <ImagenFoto localId={f.localId} cliente={f.razonSocial} />
      <strong>{f.razonSocial}</strong>
      <span>{f.direccion}, <strong className="comuna">{f.comuna}</strong></span>
      <span className="ayuda">{quienYCuando(f.subidaPor, f.subidaEn)}</span>
      <BotonesEliminar
        cliente={f.razonSocial}
        ocupado={ocupado}
        alEliminar={() => void ejecutar(() => api.quitarFoto(f.localId))}
        dejar={{ texto: '✓ VERIFICADA', etiqueta: `VERIFICAR LA FOTO DE ${f.razonSocial}`, variante: 'primario', alTocar: () => void ejecutar(() => api.verificarFoto(f.localId, f.fotoPath, true)) }}
      />
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </li>
  );
};

const FilaVerificada = ({ f, alCambiar }: { readonly f: FotoVerificada; readonly alCambiar: () => void }) => {
  const { api, ocupado, error, ejecutar } = useAccionesDeFoto(alCambiar);
  const cuando = fechaYHoraEnChile(f.verificadaEn);
  return (
    <li className="tarjeta" aria-label={`Foto verificada de ${f.razonSocial}`}>
      <ImagenFoto localId={f.localId} cliente={f.razonSocial} />
      <strong>{f.razonSocial}</strong>
      <span>{f.direccion}, <strong className="comuna">{f.comuna}</strong></span>
      <span className="ayuda">Verificó {f.verificadaPor ?? 'alguien'}{cuando !== '' ? ` el ${cuando}` : ''}. {quienYCuando(f.subidaPor, f.subidaEn)}</span>
      <BotonesEliminar
        cliente={f.razonSocial}
        ocupado={ocupado}
        alEliminar={() => void ejecutar(() => api.quitarFoto(f.localId))}
        dejar={{ texto: 'VOLVER A POR VERIFICAR', etiqueta: `VOLVER A POR VERIFICAR LA FOTO DE ${f.razonSocial}`, alTocar: () => void ejecutar(() => api.verificarFoto(f.localId, f.fotoPath, false)) }}
      />
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </li>
  );
};

/** Las ya verificadas: ocultas hasta pedirlas, para no cargar decenas de fotos que ya se revisaron. */
const Verificadas = ({ fotos, alCambiar }: { readonly fotos: readonly FotoVerificada[]; readonly alCambiar: () => void }) => {
  const [visibles, setVisibles] = useState(false);
  if (fotos.length === 0) return <Aviso>Todavía no has verificado ninguna foto.</Aviso>;
  return (
    <>
      <Boton variante="secundario" onClick={() => { setVisibles((v) => !v); }}>{visibles ? 'OCULTAR LAS VERIFICADAS' : 'VER LAS VERIFICADAS'}</Boton>
      {visibles ? <ul className="tarjetas">{fotos.map((f) => <FilaVerificada key={f.localId} f={f} alCambiar={alCambiar} />)}</ul> : null}
    </>
  );
};

/** Panel del admin para revisar fotos: las que reportó el equipo y las subidas, separadas en «por verificar» y «verificadas». */
export const PaginaFotos = () => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.fotosParaRevision(), [api]);
  const { estado, recargar, refrescar } = useCarga(cargar);
  return (
    <Pagina titulo="Revisar fotos">
      <p>Aquí ves las fotos que el equipo reportó y las que se subieron. Si una está bien, toca ✓ VERIFICADA y sale de la lista (queda en «Verificadas»). Si está mal (no es la fachada, se ven personas, está borrosa), elimínala: el local queda sin foto y alguien la vuelve a tomar.</p>
      {estado.tipo === 'cargando' ? <Cargando /> : null}
      {estado.tipo === 'error' ? <ErrorCarga error={estado.error} alReintentar={recargar} /> : null}
      {estado.tipo === 'ok' ? (
        <>
          <h2>Reportadas ({estado.datos.reportadas.length})</h2>
          {estado.datos.reportadas.length === 0 ? <Aviso tipo="exito">No hay fotos reportadas por revisar.</Aviso> : (
            <ul className="tarjetas">{estado.datos.reportadas.map((r) => <FilaReportada key={r.id} r={r} alCambiar={refrescar} />)}</ul>
          )}
          <h2>Por verificar ({estado.datos.porVerificar.length})</h2>
          {estado.datos.porVerificar.length === 0 ? <Aviso tipo="exito">No hay fotos por verificar: todo al día.</Aviso> : (
            <ul className="tarjetas">{estado.datos.porVerificar.map((f) => <FilaPorVerificar key={f.localId} f={f} alCambiar={refrescar} />)}</ul>
          )}
          <h2>Verificadas ({estado.datos.verificadas.length})</h2>
          <Verificadas fotos={estado.datos.verificadas} alCambiar={refrescar} />
        </>
      ) : null}
    </Pagina>
  );
};
