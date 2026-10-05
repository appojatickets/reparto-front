import { useMemo, useState, type ChangeEvent } from 'react';
import { COMUNAS_RM } from '../../../../domain/comunas';
import { analizarListaEnlaces, entradasDeFilasConEnlace, esListaDeEnlaces } from '../../../../domain/lista-enlaces';
import { analizarListaMaps, completarEntrada, esListaDeMaps, faltaSolo, filasParaImportar, resumir, type Correccion, type EntradaMapa } from '../../../../domain/lista-maps';
import { completarConPin, mapearClientes, parsearTabla, sinEnlace, type CampoCliente } from '../../../../domain/tabla';
import { mensajeDeError } from '../../../../application/mensajes';
import type { ResultadoImportacion } from '../../../../application/modelos';
import type { Progreso } from '../../../../application/use-cases/importar-clientes';
import type { AvanceEnlaces, ResultadoEnlaces } from '../../../../application/use-cases/importar-enlaces';
import { useCasos } from '../contexto';
import { AreaTexto, Aviso, Boton, Campo, Pagina, Selector } from '../componentes/ui';
import { BuscarPines } from '../componentes/BuscarPines';
import { HorariosDeNotas } from '../componentes/HorariosDeNotas';

const NOMBRE_CAMPO: Record<CampoCliente, string> = {
  rut: 'RUT', razonSocial: 'Razón social', giro: 'Giro', direccion: 'Dirección', comuna: 'Comuna', lat: 'Latitud', lng: 'Longitud', nota: 'Nota', enlace: 'Enlace de Google Maps',
};
const MAX_ERRORES_VISIBLES = 50;
const MAX_REVISAR_VISIBLES = 40;

const FilaRevisar = ({ e, alCambiar, alOmitir }: { readonly e: EntradaMapa; readonly alCambiar: (c: Correccion) => void; readonly alOmitir: () => void }) => (
  <li className="tarjeta" aria-label={`Para revisar ${e.numero}`}>
    <strong>#{e.numero}</strong>
    <span>{e.motivos.join(' ')}</span>
    <Campo etiqueta={`Razón social #${e.numero}`} value={e.razonSocial ?? ''} onChange={(ev) => { alCambiar({ razonSocial: ev.target.value }); }} autoComplete="off" />
    <Campo etiqueta={`Dirección #${e.numero}`} value={e.direccion ?? ''} onChange={(ev) => { alCambiar({ direccion: ev.target.value }); }} autoComplete="off" />
    <Selector etiqueta={`Comuna #${e.numero}`} value={e.comuna ?? ''} onChange={(ev) => { alCambiar({ comuna: ev.target.value }); }}>
      <option value="">Elegir comuna…</option>
      {COMUNAS_RM.map((c) => <option key={c} value={c}>{c}</option>)}
    </Selector>
    {e.sugerenciasComuna ? (
      <div className="fila-botones">
        {e.sugerenciasComuna.map((c) => <Boton key={c} variante="secundario" aria-label={`USAR ${c} en #${e.numero}`} onClick={() => { alCambiar({ comuna: c }); }}>{`USAR ${c.toUpperCase()}`}</Boton>)}
      </div>
    ) : null}
    {e.lat !== undefined ? <span>Pin: {e.lat}, {e.lng}</span> : null}
    <Boton variante="secundario" aria-label={`OMITIR #${e.numero}`} onClick={alOmitir}>OMITIR (NO IMPORTAR)</Boton>
  </li>
);

const ResultadoDeEnlaces = ({ r }: { readonly r: ResultadoEnlaces }) => (
  <section aria-label="Resultado de la importación de direcciones" className="pagina">
    <Aviso tipo={r.fallos.length === 0 ? 'exito' : 'info'}>
      Listo: {r.creados} clientes nuevos · {r.yaExistian} ya existían (se completaron) · pines fijados con el enlace: {r.pinesFijados}
      {r.pinesPropuestos > 0 ? ` · quedaron como propuesta para revisar (ya tenían un pin validado): ${r.pinesPropuestos}` : ''} · por buscar por dirección: {r.porBuscar}.
    </Aviso>
    {r.porBuscar > 0 ? <p>Para ubicar los que faltan usa «BUSCAR LOS PINES POR DIRECCIÓN» más abajo.</p> : null}
    {r.pinesNoLeidos.length > 0 ? (
      <>
        <Aviso>No se pudo leer el enlace de {r.pinesNoLeidos.length} (los clientes quedaron cargados; su pin se completa por dirección o pegando el enlace en su ficha).</Aviso>
        <ul>{r.pinesNoLeidos.slice(0, MAX_ERRORES_VISIBLES).map((f) => <li key={f.numero}>#{f.numero} {f.direccion}</li>)}</ul>
      </>
    ) : null}
    {r.fallos.length > 0 ? (
      <>
        <Aviso tipo="error">No se pudieron cargar {r.fallos.length}. Vuelve a tocar IMPORTAR: lo ya cargado no se duplica.</Aviso>
        <ul>{r.fallos.slice(0, MAX_ERRORES_VISIBLES).map((f) => <li key={f.numero}>#{f.numero} {f.direccion}: {f.mensaje}</li>)}</ul>
      </>
    ) : null}
  </section>
);

export const PaginaImportar = () => {
  const { importarClientesEnLotes, importarEnlaces, completarComunas } = useCasos();
  const [texto, setTexto] = useState('');
  const [progreso, setProgreso] = useState<Progreso | undefined>();
  const [resultado, setResultado] = useState<ResultadoImportacion | undefined>();
  const [fallo, setFallo] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);

  const [correcciones, setCorrecciones] = useState<Readonly<Record<number, Correccion>>>({});
  const [incluirAproximadas, setIncluirAproximadas] = useState(true);
  const [incluirSinNombre, setIncluirSinNombre] = useState(false);
  const [incluirSinDireccion, setIncluirSinDireccion] = useState(false);
  const [omitidas, setOmitidas] = useState<ReadonlySet<number>>(new Set());
  const [buscando, setBuscando] = useState<{ readonly hechos: number; readonly total: number } | undefined>();
  const [avisoComunas, setAvisoComunas] = useState<string | undefined>();

  const esMaps = esListaDeMaps(texto);
  const mapeo = useMemo(() => mapearClientes(parsearTabla(esMaps ? '' : texto)), [texto, esMaps]);
  // Una planilla con sus columnas manda sobre la lista de direcciones: aunque traiga una columna de enlaces, se importa como planilla.
  const esPlanilla = mapeo.filas.length > 0 && mapeo.faltantes.length === 0;
  const esEnlaces = !esMaps && !esPlanilla && esListaDeEnlaces(texto);
  const modoTabla = !esMaps && !esEnlaces;
  const analisisEnlaces = useMemo(() => (esEnlaces ? analizarListaEnlaces(texto) : undefined), [texto, esEnlaces]);
  const [avanceEnlaces, setAvanceEnlaces] = useState<AvanceEnlaces | undefined>();
  const [resultadoEnlaces, setResultadoEnlaces] = useState<ResultadoEnlaces | undefined>();
  const importarListaEnlaces = async (): Promise<void> => {
    if (!analisisEnlaces) return;
    setOcupado(true);
    setResultadoEnlaces(undefined);
    setAvanceEnlaces({ procesadas: 0, total: analisisEnlaces.resumen.listas });
    const r = await importarEnlaces(analisisEnlaces.entradas, setAvanceEnlaces);
    setOcupado(false);
    setAvanceEnlaces(undefined);
    setResultadoEnlaces(r);
  };
  const analisisMaps = useMemo(() => (esMaps ? analizarListaMaps(texto) : undefined), [texto, esMaps]);
  const entradasMaps = useMemo(() => (analisisMaps ? analisisMaps.entradas.map((e) => completarEntrada(e, correcciones[e.numero] ?? {})) : []), [analisisMaps, correcciones]);
  const resumenMaps = useMemo(() => resumir(entradasMaps), [entradasMaps]);
  const filasMaps = useMemo(() => filasParaImportar(entradasMaps, { aproximadas: incluirAproximadas, sinNombre: incluirSinNombre, sinDireccion: incluirSinDireccion }), [entradasMaps, incluirAproximadas, incluirSinNombre, incluirSinDireccion]);
  const aRevisar = entradasMaps.filter((e) => e.estado === 'revisar' && !omitidas.has(e.numero));
  const sinNombre = aRevisar.filter((e) => e.razonSocial === undefined);
  const soloSinNombre = aRevisar.filter((e) => faltaSolo(e) === 'nombre').length;
  const soloSinDireccion = aRevisar.filter((e) => faltaSolo(e) === 'direccion').length;
  const pinesSinComuna = aRevisar.filter((e) => e.comuna === undefined && e.lat !== undefined && e.lng !== undefined);
  const omitir = (numeros: readonly number[]): void => { setOmitidas((prev) => new Set([...prev, ...numeros])); };
  const buscarComunas = async (): Promise<void> => {
    setAvisoComunas(undefined);
    setBuscando({ hechos: 0, total: pinesSinComuna.length });
    const r = await completarComunas(pinesSinComuna.flatMap((e) => (e.lat !== undefined && e.lng !== undefined ? [{ numero: e.numero, lat: e.lat, lng: e.lng }] : [])), setBuscando);
    setBuscando(undefined);
    setCorrecciones((prev) => {
      const siguiente = { ...prev };
      for (const [n, comuna] of Object.entries(r.comunas)) siguiente[Number(n)] = { ...siguiente[Number(n)], comuna };
      return siguiente;
    });
    const encontradas = Object.keys(r.comunas).length;
    setAvisoComunas(r.detenido
      ? `Se detuvo (el servicio no respondió o llegó al límite): se completaron ${encontradas}. Espera un minuto y vuelve a tocar el botón para seguir con el resto.`
      : `Listo: se encontró la comuna de ${encontradas}${r.sinRespuesta > 0 ? ` y ${r.sinRespuesta} no se pudieron ubicar` : ''}.`);
  };
  const soloFaltaComuna = aRevisar.filter((e) => e.sugerenciasComuna !== undefined && e.razonSocial !== undefined && e.direccion !== undefined);
  const aceptarMasCercanas = (): void => {
    setCorrecciones((prev) => {
      const siguiente = { ...prev };
      for (const e of soloFaltaComuna) {
        const primera = e.sugerenciasComuna?.[0];
        if (primera !== undefined) siguiente[e.numero] = { ...siguiente[e.numero], comuna: primera };
      }
      return siguiente;
    });
  };

  const conPin = useMemo(() => completarConPin(mapeo.filas), [mapeo.filas]);
  const filas = esMaps ? filasMaps : conPin.filas;
  const hayFilas = filas.length > 0;
  const completa = esMaps ? filasMaps.length > 0 : hayFilas && mapeo.faltantes.length === 0;

  const leerArchivo = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const archivo = e.target.files?.[0];
    if (archivo) {
      setTexto(await archivo.text());
      setCorrecciones({});
      setOmitidas(new Set());
      setResultado(undefined);
      setFallo(undefined);
    }
  };

  const importar = async (): Promise<void> => {
    setOcupado(true);
    setResultado(undefined);
    setFallo(undefined);
    setProgreso({ procesadas: 0, total: filas.length });
    setResultadoEnlaces(undefined);
    const r = await importarClientesEnLotes(filas.map(sinEnlace), setProgreso);
    if (r.ok) {
      setResultado(r.value);
      // Las filas con enlace de Google Maps: ahora que existen, la app lee el enlace y fija el pin de cada una.
      const conEnlace = esMaps ? [] : entradasDeFilasConEnlace(filas);
      if (conEnlace.length > 0) setResultadoEnlaces(await importarEnlaces(conEnlace, setAvanceEnlaces));
      setAvanceEnlaces(undefined);
      setOcupado(false);
    } else {
      setOcupado(false);
      setResultado(r.error.parcial);
      setFallo(`Se detuvo después de ${r.error.procesadas} filas: ${mensajeDeError(r.error.error)} Puedes volver a importar; no se duplica nada.`);
    }
  };

  return (
    <Pagina titulo="Importar clientes">
      <p>Pega la planilla desde Excel (con los títulos de las columnas), elige un archivo CSV o pega la lista que copiaste de Google Maps: el sistema la ordena y la limpia. Reimportar es seguro: actualiza sin duplicar.</p>
      <div className="campo">
        <label htmlFor="archivo">Archivo CSV o TXT</label>
        <input id="archivo" type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" onChange={(e) => void leerArchivo(e)} />
      </div>
      <AreaTexto etiqueta="O pega aquí la planilla" ayuda="Pega aquí la lista tal como la copiaste de Google Maps, o una planilla con columnas: RUT (opcional), razón social, giro, dirección, comuna, latitud y longitud (opcionales)." value={texto} onChange={(e) => { setTexto(e.target.value); setResultado(undefined); setResultadoEnlaces(undefined); setCorrecciones({}); setOmitidas(new Set()); }} rows={6} />

      {esMaps ? (
        <section aria-label="Lista de Google Maps" className="pagina">
          <Aviso tipo="exito">
            Lista de Google Maps: {resumenMaps.total} lugares leídos. Listos: {resumenMaps.listas} · solo con una referencia «Cerca de…»: {resumenMaps.aproximadas} · para revisar: {resumenMaps.revisar} · cerrados para siempre (se omiten): {resumenMaps.descartadas} · repetidos (se unieron con otro): {resumenMaps.repetidas}. Con pin en el texto: {resumenMaps.conPin}.
          </Aviso>
          {resumenMaps.comunaEstimada > 0 ? <Aviso>En {resumenMaps.comunaEstimada} lugares la comuna no estaba escrita y se calculó por la ubicación del pin. Los que no traen dirección quedan como «Ubicación en el mapa»: se navega con el pin.</Aviso> : null}
          {resumenMaps.sinPinEnElTexto > 0 ? <Aviso>El texto copiado de Google Maps no trae las coordenadas de {resumenMaps.sinPinEnElTexto} lugares (solo la referencia): su pin se completará con la primera entrega o pegando el enlace que mande el vendedor.</Aviso> : null}
          <label className="campo">
            <input type="checkbox" checked={incluirAproximadas} onChange={(e) => { setIncluirAproximadas(e.target.checked); }} /> Incluir los que solo tienen una referencia («Cerca de…») como dirección
          </label>
          {soloSinNombre > 0 ? (
            <label className="campo">
              <input type="checkbox" checked={incluirSinNombre} onChange={(e) => { setIncluirSinNombre(e.target.checked); }} /> Importar también los {soloSinNombre} que no tienen nombre (quedan como «Sin nombre · dirección» y se encuentran buscando por dirección)
            </label>
          ) : null}
          {soloSinDireccion > 0 ? (
            <label className="campo">
              <input type="checkbox" checked={incluirSinDireccion} onChange={(e) => { setIncluirSinDireccion(e.target.checked); }} /> Importar también los {soloSinDireccion} que tienen nombre y comuna pero ninguna dirección (quedan con la dirección «Sin dirección»; su pin se completa con la primera entrega)
            </label>
          ) : null}
          {aRevisar.length > 0 ? (
            <>
              <h2>Para revisar ({aRevisar.length})</h2>
              <p>Completa lo que falta y quedan listos. Los que no completes no se importan; puedes volver a pegar la lista después.</p>
              {pinesSinComuna.length > 0 ? (
                <>
                  <Boton disabled={buscando !== undefined} onClick={() => void buscarComunas()}>
                    {buscando ? `BUSCANDO… ${buscando.hechos} DE ${buscando.total}` : `BUSCAR LA COMUNA DE ${pinesSinComuna.length} PINES (OPENSTREETMAP)`}
                  </Boton>
                  <p>Consulta el servicio gratuito de OpenStreetMap, un pin por segundo (unos {Math.ceil(pinesSinComuna.length * 1.1 / 60)} min). Solo se envían las coordenadas, nunca nombres ni direcciones.</p>
                </>
              ) : null}
              {avisoComunas ? <Aviso tipo="info">{avisoComunas}</Aviso> : null}
              {sinNombre.length > 0 ? <Boton variante="secundario" onClick={() => { omitir(sinNombre.map((e) => e.numero)); }}>{`OMITIR LOS ${sinNombre.length} SIN NOMBRE`}</Boton> : null}
              {soloFaltaComuna.length > 0 ? (
                <Boton variante="secundario" onClick={aceptarMasCercanas}>{`ACEPTAR LA COMUNA MÁS CERCANA EN ${soloFaltaComuna.length}`}</Boton>
              ) : null}
              <ul className="tarjetas">
                {aRevisar.slice(0, MAX_REVISAR_VISIBLES).map((e) => <FilaRevisar key={e.numero} e={e} alOmitir={() => { omitir([e.numero]); }} alCambiar={(c) => { setCorrecciones((prev) => ({ ...prev, [e.numero]: { ...prev[e.numero], ...c } })); }} />)}
              </ul>
              {aRevisar.length > MAX_REVISAR_VISIBLES ? <p>… y {aRevisar.length - MAX_REVISAR_VISIBLES} más (se muestran al completar estos).</p> : null}
            </>
          ) : null}
        </section>
      ) : null}
      {esEnlaces && analisisEnlaces ? (
        <section aria-label="Lista de direcciones con enlace" className="pagina">
          <Aviso tipo="exito">
            Lista de direcciones con enlace de Google Maps: {analisisEnlaces.resumen.total} leídas. Listas: {analisisEnlaces.resumen.listas} · con el lugar exacto (enlace corto): {analisisEnlaces.resumen.conLugarExacto} · sin lugar, el sistema lo busca por la dirección: {analisisEnlaces.resumen.porBusqueda} · repetidas (se unen): {analisisEnlaces.resumen.repetidas} · para revisar: {analisisEnlaces.resumen.revisar}.
          </Aviso>
          <p>Cada una queda como cliente con su dirección como nombre (después se cruza con el RUT y la razón social). El enlace corto fija el pin exacto para todos; a los demás les busca el pin el sistema por la dirección. Reimportar es seguro: no duplica.</p>
          {analisisEnlaces.resumen.revisar > 0 ? (
            <>
              <h2>Para revisar ({analisisEnlaces.resumen.revisar})</h2>
              <p>No se importan hasta que los corrijas en el texto de arriba (la dirección debe terminar con la comuna).</p>
              <ul className="tarjetas">
                {analisisEnlaces.entradas.filter((e) => e.estado === 'revisar').slice(0, MAX_REVISAR_VISIBLES).map((e) => (
                  <li key={e.numero} className="tarjeta"><strong>#{e.numero}</strong><span>{e.crudo}</span><span>{e.motivos.join(' ')}</span></li>
                ))}
              </ul>
            </>
          ) : null}
          <Boton disabled={ocupado || analisisEnlaces.resumen.listas === 0} onClick={() => void importarListaEnlaces()}>
            {ocupado && avanceEnlaces ? `IMPORTANDO… ${avanceEnlaces.procesadas} DE ${avanceEnlaces.total}` : `IMPORTAR ${analisisEnlaces.resumen.listas} DIRECCIONES`}
          </Boton>
          {ocupado && avanceEnlaces ? <progress max={avanceEnlaces.total} value={avanceEnlaces.procesadas} aria-label="Avance de la importación" /> : null}
          {resultadoEnlaces ? <ResultadoDeEnlaces r={resultadoEnlaces} /> : null}
        </section>
      ) : null}
      {modoTabla && texto.trim() !== '' && !hayFilas ? <Aviso tipo="error">No se encontraron filas de datos. La primera línea debe tener los títulos de las columnas.</Aviso> : null}
      {modoTabla && mapeo.faltantes.length > 0 && texto.trim() !== '' ? <Aviso tipo="error">Faltan columnas obligatorias: {mapeo.faltantes.map((c) => NOMBRE_CAMPO[c]).join(', ')}.</Aviso> : null}
      {modoTabla && mapeo.ignoradas.length > 0 && hayFilas ? <Aviso>Se ignorarán estas columnas: {mapeo.ignoradas.join(', ')}.</Aviso> : null}
      {modoTabla && conPin.completadas > 0 ? <Aviso>{conPin.completadas} filas solo traen el pin: se importan como «Ubicación en el mapa (lat, lng)» con la comuna calculada por la cercanía del pin.</Aviso> : null}
      {completa ? <Aviso tipo="exito">{filas.length} filas {esMaps ? 'listas para importar' : 'detectadas'}. El servidor revisará cada una al importar.</Aviso> : null}

      {completa ? (
        <div className="desplazable">
          <table>
            <caption>Vista previa (primeras 5 filas)</caption>
            <thead><tr><th>Razón social</th><th>Dirección</th><th>Comuna</th></tr></thead>
            <tbody>
              {filas.slice(0, 5).map((f, i) => <tr key={i}><td>{f.razonSocial}</td><td>{f.direccion}</td><td>{f.comuna}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : null}

      {!esEnlaces ? <Boton disabled={!completa || ocupado} onClick={() => void importar()}>{ocupado ? 'IMPORTANDO…' : esMaps ? `IMPORTAR ${filas.length} CLIENTES` : 'IMPORTAR'}</Boton> : null}
      {ocupado && progreso && !esEnlaces ? <><progress max={progreso.total} value={progreso.procesadas} aria-label="Avance de la importación" /><p role="status">{progreso.procesadas} de {progreso.total} filas</p></> : null}
      {fallo ? <Aviso tipo="error">{fallo}</Aviso> : null}

      <BuscarPines />
      <HorariosDeNotas />
      <p className="ayuda">Versión de la app: {__VERSION__}</p>

      {modoTabla && resultadoEnlaces ? <ResultadoDeEnlaces r={resultadoEnlaces} /> : null}
      {resultado ? (
        <section aria-label="Resultado de la importación" className="pagina">
          <Aviso tipo={resultado.errores.length === 0 && !fallo ? 'exito' : 'info'}>
            Clientes nuevos: {resultado.resumen.clientesCreados} · actualizados: {resultado.resumen.clientesActualizados} · locales nuevos: {resultado.resumen.localesCreados} · actualizados: {resultado.resumen.localesActualizados}.
            {resultado.errores.length > 0 ? ` Filas con problemas: ${resultado.errores.length}.` : ''}
          </Aviso>
          {resultado.errores.length > 0 ? (
            <div className="desplazable">
              <table>
                <caption>Filas con problemas (la fila 1 es la primera de datos)</caption>
                <thead><tr><th>Fila</th><th>Problema</th></tr></thead>
                <tbody>
                  {resultado.errores.slice(0, MAX_ERRORES_VISIBLES).map((e) => <tr key={e.fila}><td>{e.fila}</td><td>{e.errores.map((x) => x.mensaje).join(' ')}</td></tr>)}
                </tbody>
              </table>
              {resultado.errores.length > MAX_ERRORES_VISIBLES ? <p>… y {resultado.errores.length - MAX_ERRORES_VISIBLES} más.</p> : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </Pagina>
  );
};
