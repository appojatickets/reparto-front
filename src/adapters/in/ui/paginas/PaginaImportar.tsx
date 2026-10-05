import { useMemo, useState, type ChangeEvent } from 'react';
import { COMUNAS_RM } from '../../../../domain/comunas';
import { analizarListaMaps, completarEntrada, esListaDeMaps, filasParaImportar, resumir, type Correccion, type EntradaMapa } from '../../../../domain/lista-maps';
import { mapearClientes, parsearTabla, type CampoCliente } from '../../../../domain/tabla';
import { mensajeDeError } from '../../../../application/mensajes';
import type { ResultadoImportacion } from '../../../../application/modelos';
import type { Progreso } from '../../../../application/use-cases/importar-clientes';
import { useCasos } from '../contexto';
import { AreaTexto, Aviso, Boton, Campo, Pagina, Selector } from '../componentes/ui';

const NOMBRE_CAMPO: Record<CampoCliente, string> = {
  rut: 'RUT', razonSocial: 'Razón social', giro: 'Giro', direccion: 'Dirección', comuna: 'Comuna', lat: 'Latitud', lng: 'Longitud', nota: 'Nota',
};
const MAX_ERRORES_VISIBLES = 50;
const MAX_REVISAR_VISIBLES = 40;

const FilaRevisar = ({ e, alCambiar }: { readonly e: EntradaMapa; readonly alCambiar: (c: Correccion) => void }) => (
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
  </li>
);

export const PaginaImportar = () => {
  const { importarClientesEnLotes } = useCasos();
  const [texto, setTexto] = useState('');
  const [progreso, setProgreso] = useState<Progreso | undefined>();
  const [resultado, setResultado] = useState<ResultadoImportacion | undefined>();
  const [fallo, setFallo] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);

  const [correcciones, setCorrecciones] = useState<Readonly<Record<number, Correccion>>>({});
  const [incluirAproximadas, setIncluirAproximadas] = useState(true);

  const esMaps = esListaDeMaps(texto);
  const mapeo = useMemo(() => mapearClientes(parsearTabla(esMaps ? '' : texto)), [texto, esMaps]);
  const analisisMaps = useMemo(() => (esMaps ? analizarListaMaps(texto) : undefined), [texto, esMaps]);
  const entradasMaps = useMemo(() => (analisisMaps ? analisisMaps.entradas.map((e) => completarEntrada(e, correcciones[e.numero] ?? {})) : []), [analisisMaps, correcciones]);
  const resumenMaps = useMemo(() => resumir(entradasMaps), [entradasMaps]);
  const filasMaps = useMemo(() => filasParaImportar(entradasMaps, incluirAproximadas), [entradasMaps, incluirAproximadas]);
  const aRevisar = entradasMaps.filter((e) => e.estado === 'revisar');
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

  const filas = esMaps ? filasMaps : mapeo.filas;
  const hayFilas = filas.length > 0;
  const completa = esMaps ? filasMaps.length > 0 : hayFilas && mapeo.faltantes.length === 0;

  const leerArchivo = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const archivo = e.target.files?.[0];
    if (archivo) {
      setTexto(await archivo.text());
      setCorrecciones({});
      setResultado(undefined);
      setFallo(undefined);
    }
  };

  const importar = async (): Promise<void> => {
    setOcupado(true);
    setResultado(undefined);
    setFallo(undefined);
    setProgreso({ procesadas: 0, total: filas.length });
    const r = await importarClientesEnLotes(filas, setProgreso);
    setOcupado(false);
    if (r.ok) setResultado(r.value);
    else {
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
      <AreaTexto etiqueta="O pega aquí la planilla" ayuda="Pega aquí la lista tal como la copiaste de Google Maps, o una planilla con columnas: RUT (opcional), razón social, giro, dirección, comuna, latitud y longitud (opcionales)." value={texto} onChange={(e) => { setTexto(e.target.value); setResultado(undefined); setCorrecciones({}); }} rows={6} />

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
          {aRevisar.length > 0 ? (
            <>
              <h2>Para revisar ({aRevisar.length})</h2>
              <p>Completa lo que falta y quedan listos. Los que no completes no se importan; puedes volver a pegar la lista después.</p>
              {soloFaltaComuna.length > 0 ? (
                <Boton variante="secundario" onClick={aceptarMasCercanas}>{`ACEPTAR LA COMUNA MÁS CERCANA EN ${soloFaltaComuna.length}`}</Boton>
              ) : null}
              <ul className="tarjetas">
                {aRevisar.slice(0, MAX_REVISAR_VISIBLES).map((e) => <FilaRevisar key={e.numero} e={e} alCambiar={(c) => { setCorrecciones((prev) => ({ ...prev, [e.numero]: { ...prev[e.numero], ...c } })); }} />)}
              </ul>
              {aRevisar.length > MAX_REVISAR_VISIBLES ? <p>… y {aRevisar.length - MAX_REVISAR_VISIBLES} más (se muestran al completar estos).</p> : null}
            </>
          ) : null}
        </section>
      ) : null}
      {!esMaps && texto.trim() !== '' && !hayFilas ? <Aviso tipo="error">No se encontraron filas de datos. La primera línea debe tener los títulos de las columnas.</Aviso> : null}
      {!esMaps && mapeo.faltantes.length > 0 && texto.trim() !== '' ? <Aviso tipo="error">Faltan columnas obligatorias: {mapeo.faltantes.map((c) => NOMBRE_CAMPO[c]).join(', ')}.</Aviso> : null}
      {!esMaps && mapeo.ignoradas.length > 0 && hayFilas ? <Aviso>Se ignorarán estas columnas: {mapeo.ignoradas.join(', ')}.</Aviso> : null}
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

      <Boton disabled={!completa || ocupado} onClick={() => void importar()}>{ocupado ? 'IMPORTANDO…' : esMaps ? `IMPORTAR ${filas.length} CLIENTES` : 'IMPORTAR'}</Boton>
      {ocupado && progreso ? <><progress max={progreso.total} value={progreso.procesadas} aria-label="Avance de la importación" /><p role="status">{progreso.procesadas} de {progreso.total} filas</p></> : null}
      {fallo ? <Aviso tipo="error">{fallo}</Aviso> : null}

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
