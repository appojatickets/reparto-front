import { useMemo, useState, type ChangeEvent } from 'react';
import { mapearClientes, parsearTabla, type CampoCliente } from '../../../../domain/tabla';
import { mensajeDeError } from '../../../../application/mensajes';
import type { ResultadoImportacion } from '../../../../application/modelos';
import type { Progreso } from '../../../../application/use-cases/importar-clientes';
import { useCasos } from '../contexto';
import { AreaTexto, Aviso, Boton, Pagina } from '../componentes/ui';

const NOMBRE_CAMPO: Record<CampoCliente, string> = {
  rut: 'RUT', razonSocial: 'Razón social', giro: 'Giro', direccion: 'Dirección', comuna: 'Comuna', lat: 'Latitud', lng: 'Longitud', nota: 'Nota',
};
const MAX_ERRORES_VISIBLES = 50;

export const PaginaImportar = () => {
  const { importarClientesEnLotes } = useCasos();
  const [texto, setTexto] = useState('');
  const [progreso, setProgreso] = useState<Progreso | undefined>();
  const [resultado, setResultado] = useState<ResultadoImportacion | undefined>();
  const [fallo, setFallo] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);

  const mapeo = useMemo(() => mapearClientes(parsearTabla(texto)), [texto]);
  const hayFilas = mapeo.filas.length > 0;
  const completa = hayFilas && mapeo.faltantes.length === 0;

  const leerArchivo = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const archivo = e.target.files?.[0];
    if (archivo) {
      setTexto(await archivo.text());
      setResultado(undefined);
      setFallo(undefined);
    }
  };

  const importar = async (): Promise<void> => {
    setOcupado(true);
    setResultado(undefined);
    setFallo(undefined);
    setProgreso({ procesadas: 0, total: mapeo.filas.length });
    const r = await importarClientesEnLotes(mapeo.filas, setProgreso);
    setOcupado(false);
    if (r.ok) setResultado(r.value);
    else {
      setResultado(r.error.parcial);
      setFallo(`Se detuvo después de ${r.error.procesadas} filas: ${mensajeDeError(r.error.error)} Puedes volver a importar; no se duplica nada.`);
    }
  };

  return (
    <Pagina titulo="Importar clientes">
      <p>Pega la planilla desde Excel (con los títulos de las columnas) o elige un archivo CSV. Reimportar es seguro: actualiza sin duplicar.</p>
      <div className="campo">
        <label htmlFor="archivo">Archivo CSV o TXT</label>
        <input id="archivo" type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" onChange={(e) => void leerArchivo(e)} />
      </div>
      <AreaTexto etiqueta="O pega aquí la planilla" ayuda="Columnas: RUT (opcional), razón social, giro, dirección, comuna, latitud y longitud (opcionales)." value={texto} onChange={(e) => { setTexto(e.target.value); setResultado(undefined); }} rows={6} />

      {texto.trim() !== '' && !hayFilas ? <Aviso tipo="error">No se encontraron filas de datos. La primera línea debe tener los títulos de las columnas.</Aviso> : null}
      {mapeo.faltantes.length > 0 && texto.trim() !== '' ? <Aviso tipo="error">Faltan columnas obligatorias: {mapeo.faltantes.map((c) => NOMBRE_CAMPO[c]).join(', ')}.</Aviso> : null}
      {mapeo.ignoradas.length > 0 && hayFilas ? <Aviso>Se ignorarán estas columnas: {mapeo.ignoradas.join(', ')}.</Aviso> : null}
      {completa ? <Aviso tipo="exito">{mapeo.filas.length} filas detectadas. El servidor revisará cada una al importar.</Aviso> : null}

      {completa ? (
        <div className="desplazable">
          <table>
            <caption>Vista previa (primeras 5 filas)</caption>
            <thead><tr><th>Razón social</th><th>Dirección</th><th>Comuna</th></tr></thead>
            <tbody>
              {mapeo.filas.slice(0, 5).map((f, i) => <tr key={i}><td>{f.razonSocial}</td><td>{f.direccion}</td><td>{f.comuna}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : null}

      <Boton disabled={!completa || ocupado} onClick={() => void importar()}>{ocupado ? 'IMPORTANDO…' : 'IMPORTAR'}</Boton>
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
