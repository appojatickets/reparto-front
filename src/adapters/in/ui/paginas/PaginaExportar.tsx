import { useState } from 'react';
import { COMUNAS_RM } from '../../../../domain/comunas';
import { aCsv, COLUMNAS, COLUMNAS_POR_DEFECTO, nombreDeArchivo, resumir, type FormatoCsv, type IdColumna } from '../../../../domain/exportacion';
import { fechaEnChile } from '../../../../domain/fechas';
import { mensajeDeError } from '../../../../application/mensajes';
import type { FilaExportacion, FiltroExportacion } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { Aviso, Boton, Campo, Pagina, Selector } from '../componentes/ui';

const VISTA_PREVIA = 5;

type Pin = 'todos' | NonNullable<FiltroExportacion['pin']>;
type Foto = 'todas' | NonNullable<FiltroExportacion['foto']>;

export const PaginaExportar = () => {
  const { api, descarga, exportacion, ahora } = useCasos();
  const guardadas = exportacion.cargar();
  const [comunas, setComunas] = useState<readonly string[]>([]);
  const [pin, setPin] = useState<Pin>('todos');
  const [foto, setFoto] = useState<Foto>('todas');
  const [texto, setTexto] = useState('');
  const [columnas, setColumnas] = useState<readonly IdColumna[]>(guardadas?.columnas ?? COLUMNAS_POR_DEFECTO);
  const [formato, setFormato] = useState<FormatoCsv>(guardadas?.formato ?? 'excel');
  const [filas, setFilas] = useState<readonly FilaExportacion[] | undefined>();
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState(false);
  const [guardado, setGuardado] = useState<string | undefined>();

  /** Cambiar un filtro deja de lado lo que ya se había consultado: lo que se descarga siempre es lo que dicen los filtros. */
  const cambiaFiltro = (): void => {
    setFilas(undefined);
    setGuardado(undefined);
  };
  const recordar = (c: readonly IdColumna[], f: FormatoCsv): void => {
    exportacion.guardar({ columnas: c, formato: f });
  };
  const elegirColumnas = (c: readonly IdColumna[]): void => {
    setColumnas(c);
    setGuardado(undefined);
    recordar(c, formato);
  };
  const alternarColumna = (id: IdColumna): void => {
    elegirColumnas(columnas.includes(id) ? columnas.filter((x) => x !== id) : [...columnas, id]);
  };

  const filtro = (): FiltroExportacion => ({
    ...(comunas.length > 0 ? { comunas } : {}),
    ...(pin !== 'todos' ? { pin } : {}),
    ...(foto !== 'todas' ? { foto } : {}),
    ...(texto.trim() !== '' ? { texto: texto.trim() } : {}),
  });

  const consultar = async (): Promise<void> => {
    setOcupado(true);
    setError(undefined);
    setGuardado(undefined);
    const r = await api.exportarLocales(filtro());
    setOcupado(false);
    if (r.ok) {
      setFilas(r.value.filas);
      setTotal(r.value.total);
    } else setError(mensajeDeError(r.error));
  };

  const descargar = (): void => {
    if (!filas || columnas.length === 0) return;
    const nombre = nombreDeArchivo(fechaEnChile(ahora()));
    descarga.guardarTexto(nombre, aCsv(filas, columnas, formato), 'text/csv');
    recordar(columnas, formato);
    setGuardado(`Listo: ${nombre} con ${String(filas.length)} locales y ${String(columnas.length)} columnas (queda en Descargas).`);
  };

  const disponibles = COMUNAS_RM.filter((c) => !comunas.includes(c));
  const resumen = filas ? resumir(filas) : undefined;
  const vistaPrevia = filas?.slice(0, VISTA_PREVIA) ?? [];
  const columnasElegidas = COLUMNAS.filter((c) => columnas.includes(c.id));

  return (
    <Pagina titulo="Exportar datos">
      <p>Elige qué locales y qué datos llevar, mira cuántos son y descarga el archivo para abrirlo en Excel.</p>

      <h2>1. Qué locales</h2>
      <Selector etiqueta="Agregar comuna (sin elegir ninguna salen todas)" value="" onChange={(e) => { if (e.target.value !== '') { setComunas([...comunas, e.target.value]); cambiaFiltro(); } }}>
        <option value="">Todas las comunas</option>
        {disponibles.map((c) => <option key={c} value={c}>{c}</option>)}
      </Selector>
      {comunas.length > 0 ? (
        <ul className="insignias" aria-label="Comunas elegidas">
          {comunas.map((c) => (
            <li key={c}>
              <Boton variante="secundario" aria-label={`Quitar ${c}`} onClick={() => { setComunas(comunas.filter((x) => x !== c)); cambiaFiltro(); }}>{c} ✕</Boton>
            </li>
          ))}
        </ul>
      ) : null}
      <Selector etiqueta="Ubicación (pin)" value={pin} onChange={(e) => { setPin(e.target.value as Pin); cambiaFiltro(); }}>
        <option value="todos">Todos</option>
        <option value="con">Con pin</option>
        <option value="sin">Sin pin</option>
        <option value="aproximado">Con pin aproximado (por revisar)</option>
      </Selector>
      <Selector etiqueta="¿Tiene foto de la fachada?" value={foto} onChange={(e) => { setFoto(e.target.value as Foto); cambiaFiltro(); }}>
        <option value="todas">Todos</option>
        <option value="con">Con foto</option>
        <option value="sin">Sin foto</option>
      </Selector>
      <Campo etiqueta="Buscar (razón social, RUT o dirección)" value={texto} onChange={(e) => { setTexto(e.target.value); cambiaFiltro(); }} autoComplete="off" />

      <h2>2. Qué datos</h2>
      <fieldset className="campo">
        <legend>Columnas del archivo</legend>
        <div className="fila-botones">
          <Boton variante="secundario" onClick={() => { elegirColumnas(COLUMNAS.map((c) => c.id)); }}>TODAS LAS COLUMNAS</Boton>
          <Boton variante="secundario" onClick={() => { elegirColumnas(COLUMNAS_POR_DEFECTO); }}>LAS BÁSICAS</Boton>
        </div>
        {COLUMNAS.map((c) => (
          <label key={c.id} className="casilla"><input type="checkbox" checked={columnas.includes(c.id)} onChange={() => { alternarColumna(c.id); }} /> {c.titulo}</label>
        ))}
      </fieldset>
      <Selector etiqueta="Formato" value={formato} onChange={(e) => { const f = e.target.value as FormatoCsv; setFormato(f); setGuardado(undefined); recordar(columnas, f); }}>
        <option value="excel">Excel en español (separa con punto y coma, decimales con coma)</option>
        <option value="estandar">Estándar (separa con coma, decimales con punto)</option>
      </Selector>

      <h2>3. Descargar</h2>
      <Boton disabled={ocupado} onClick={() => void consultar()}>{ocupado ? 'BUSCANDO…' : 'VER CUÁNTOS SON'}</Boton>
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      {resumen ? (
        <>
          <Aviso tipo={resumen.total === 0 ? 'info' : 'exito'}>
            {resumen.total === 0 ? 'No hay locales con esos filtros.' : `${String(resumen.total)} locales · ${String(resumen.conPin)} con pin, ${String(resumen.sinPin)} sin pin · ${String(resumen.conFoto)} con foto, ${String(resumen.sinFoto)} sin foto.`}
          </Aviso>
          {total > resumen.total ? <Aviso>Hay {String(total)} locales con esos filtros; el archivo trae los primeros {String(resumen.total)}. Afina los filtros para el resto.</Aviso> : null}
          {resumen.total > 0 && columnasElegidas.length > 0 ? (
            <div className="tarjeta" aria-label="Vista previa">
              <strong>Así se verá (primeros {String(vistaPrevia.length)})</strong>
              <div className="desplazable">
                <table>
                  <thead><tr>{columnasElegidas.map((c) => <th key={c.id} scope="col">{c.titulo}</th>)}</tr></thead>
                  <tbody>
                    {vistaPrevia.map((f) => (
                      <tr key={f.localId}>{columnasElegidas.map((c) => <td key={c.id}>{c.valor(f) ?? ''}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {columnas.length === 0 ? <Aviso tipo="error">Marca al menos una columna.</Aviso> : null}
          <Boton disabled={resumen.total === 0 || columnas.length === 0} onClick={descargar}>DESCARGAR ARCHIVO (CSV)</Boton>
        </>
      ) : null}
      {guardado ? <Aviso tipo="exito">{guardado}</Aviso> : null}
    </Pagina>
  );
};
