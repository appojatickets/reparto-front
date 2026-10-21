import { useCallback, useState } from 'react';
import type { Jornada, VistaRuta } from '../../../../application/modelos';
import { COMUNAS_RM } from '../../../../domain/comunas';
import { mensajeDeError } from '../../../../application/mensajes';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { Aviso, Boton, Cargando, ErrorCarga, Selector } from './ui';

export const OrganizacionRuta = ({ jornada, alPreparada, alCambiar }: { readonly jornada: Jornada; readonly alPreparada?: ((lista: boolean) => void) | undefined; readonly alCambiar?: ((v: VistaRuta) => void) | undefined }) => {
  const { api } = useCasos();
  const consultar = useCallback(async () => { const r = await api.verRuta(jornada.camion.id, jornada.fecha); alPreparada?.(r.ok && r.value.planificada); return r; }, [api, jornada.camion.id, jornada.fecha, alPreparada]);
  const { estado, recargar } = useCarga(consultar);
  if (estado.tipo === 'cargando') return <Cargando texto="Consultando organización de la ruta…" />;
  if (estado.tipo === 'error') return <ErrorCarga error={estado.error} alReintentar={recargar} />;
  return <FormularioOrganizacion key={`${jornada.camion.id}:${jornada.fecha}:${estado.datos.version}`} jornada={jornada} vista={estado.datos} alCambiar={v => { alPreparada?.(true); alCambiar?.(v); }} />;
};

const FormularioOrganizacion = ({ jornada, vista, alCambiar }: { readonly jornada: Jornada; readonly vista: VistaRuta; readonly alCambiar?: ((v: VistaRuta) => void) | undefined }) => {
  const { api, armado } = useCasos();
  const [modo, setModo] = useState<'calcular' | 'carga' | ''>(() => vista.planificada ? vista.modo === 'carga' ? 'carga' : 'calcular' : armado.cargar() ?? '');
  const [comunas, setComunas] = useState<readonly string[]>(vista.ordenComunas ?? []);
  const [planificada, setPlanificada] = useState(vista.planificada);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const guardar = async (): Promise<void> => {
    if (modo === '') return;
    setOcupado(true); setError(''); setAviso('');
    try {
      const r = await api.planificarRuta(jornada.camion.id, jornada.fecha, undefined, modo, comunas);
      if (!r.ok) setError(mensajeDeError(r.error));
      else { armado.guardar(modo); setAviso('Organización guardada para este camión y día.'); alCambiar?.(r.value); setPlanificada(true); }
    } catch { setError('No se guardó. Revisa la conexión y reintenta.'); }
    finally { setOcupado(false); }
  };
  return <details className="opciones-simples" open={!planificada}>
    <summary>ORGANIZACIÓN: {modo === 'carga' ? 'EN MI ORDEN' : modo === 'calcular' ? 'AUTOMÁTICA' : 'ELIGE EL MODO'}</summary>
    <div className="pagina">
      <Selector etiqueta="Cómo cargarás las facturas" value={modo} disabled={ocupado} onChange={e => { setModo(e.target.value as typeof modo); setAviso(''); }}>
        <option value="">Elige antes de comenzar</option>
        <option value="carga">Las cargaré en orden de entrega</option>
        <option value="calcular">Las cargo sin orden: organiza el sistema</option>
      </Selector>
      <p className="ayuda">{modo === 'carga' ? 'Se conserva tu secuencia y puedes mover entregas desde el mapa o la lista.' : 'El sistema prioriza cercanía y tiempos por calles. Puedes elegir por cuál comenzar y corregir posiciones.'}</p>
      <Selector etiqueta="Añadir comuna al orden de entrega" value="" disabled={ocupado} onChange={e => { if (e.target.value) setComunas([...comunas, e.target.value]); setAviso(''); }}>
        <option value="">{comunas.length ? 'Añadir la siguiente comuna…' : 'Automático, o elige la primera comuna…'}</option>
        {COMUNAS_RM.filter(c => !comunas.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
      </Selector>
      {comunas.length ? <>
        <ol className="tarjetas">{comunas.map((c, i) => <li className="tarjeta" key={c}><strong>{i + 1}. {c}</strong><div className="fila-botones">
          <Boton variante="secundario" disabled={ocupado || i === 0} aria-label={`Adelantar ${c}`} onClick={() => { const orden = [...comunas]; [orden[i - 1], orden[i]] = [c, comunas[i - 1] ?? c]; setComunas(orden); }}>ANTES</Boton>
          <Boton variante="secundario" disabled={ocupado} aria-label={`Quitar ${c} del orden`} onClick={() => { setComunas(comunas.filter(x => x !== c)); }}>QUITAR</Boton>
        </div></li>)}</ol>
        <p className="ayuda">En automático se priorizan estos bloques y se calcula también su conexión. Las comunas no elegidas quedan después. En manual manda tu orden de carga.</p>
      </> : <p className="ayuda">Sin preferencia de comunas: se calcula todo el recorrido por cercanía.</p>}
      {planificada ? <Aviso>Guardar volverá a organizar las entregas pendientes según estas opciones.</Aviso> : null}
      <Boton disabled={ocupado || modo === ''} onClick={() => void guardar()}>{ocupado ? 'GUARDANDO…' : 'GUARDAR ORGANIZACIÓN'}</Boton>
      {aviso ? <Aviso tipo="exito">{aviso}</Aviso> : null}
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
    </div>
  </details>;
};
