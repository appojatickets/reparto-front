import { useEffect, useState } from 'react';
import type { CajasActuales } from '../../../../application/modelos';
import { mensajeDeError } from '../../../../application/mensajes';
import { useCasos } from '../contexto';
import { Aviso, Boton } from './ui';
export const EVENTO_CAJAS = 'reparto:cajas-actualizadas';
const numero = (s: string): number => s.trim() === '' ? Number.NaN : Number(s.replace(',', '.'));
/** La carga física se comparte; cada integrante declara su participación y sus rebajes. */
export const ControlCajas = ({ cierre = false, alCerrar }: { readonly cierre?: boolean; readonly alCerrar?: () => Promise<void> | void }) => {
 const { api } = useCasos();
 const [actual,setActual] = useState<CajasActuales | null>();
 const [bultos,setBultos] = useState('');
 const [camion,setCamion] = useState(''); const [propias,setPropias] = useState('');
 const [cerrado,setCerrado] = useState('0'); const [rebaje,setRebaje] = useState('0'); const [fisico,setFisico] = useState('0');
 const [error,setError] = useState(''); const [ocupado,setOcupado] = useState(false);
 useEffect(() => {
  let vivo = true;
  const cargar = (): void => { void api.obtenerCajas().then(r => { if (!vivo) return; if (!r.ok) { setError(mensajeDeError(r.error)); return; } const c=r.value; setActual(c); if(c) { setBultos(c.bultos === undefined || c.bultos === null ? '' : String(c.bultos));setCamion(String(c.cargadasCamion));setPropias(String(c.cargadasUsuario));setCerrado(String(c.porCerrado));setRebaje(String(c.rebajes));setFisico(String(c.rebajesCamion ?? 0)); } else {setBultos('');setCamion('');setPropias('');setCerrado('0');setRebaje('0');setFisico('0');} }).catch(() => { if(vivo) setError('No se pudo consultar el control de cajas. Reintenta antes de cerrar.'); }); };
  cargar(); window.addEventListener(EVENTO_CAJAS,cargar);
  return () => { vivo=false;window.removeEventListener(EVENTO_CAJAS,cargar); };
 },[api]);
 const guardar = async (): Promise<void> => {
  setOcupado(true);setError('');
  try { const r=await api.guardarCajas({ ...(bultos.trim()!==''?{bultos:numero(bultos)}:{}),cargadasCamion:numero(camion),cargadasUsuario:numero(propias),revision:actual?.revision ?? 0 }); if(!r.ok) setError(mensajeDeError(r.error)); else {setActual(r.value);window.dispatchEvent(new Event(EVENTO_CAJAS));} }
  catch { setError('No se guardó la carga. Comprueba la conexión y reintenta.'); } finally {setOcupado(false);}
 };
 const cerrar = async (): Promise<void> => {
  if(!actual?.registrada) {setError('Primero guarda las cajas cargadas, aunque sean cero.');return;}
  setOcupado(true);setError('');
  try { const r=await api.cerrarCajas({porCerrado:numero(cerrado),rebajes:numero(rebaje),rebajesCamion:numero(fisico)});if(!r.ok)setError(mensajeDeError(r.error));else{window.dispatchEvent(new Event(EVENTO_CAJAS));await alCerrar?.();} }
  catch{setError('No se confirmó el cierre. Comprueba la conexión y reintenta.');}finally{setOcupado(false);}
 };
 const entradasCarga = <>
  <label>Bultos cargados (si los conoces)<input inputMode="decimal" value={bultos} onChange={e=>{setBultos(e.target.value);}} disabled={ocupado || actual?.cerrada} /></label>
  <p className="ayuda">Anota el total de cajas equivalente por separado; no se asume que todos los bultos contienen lo mismo.</p>
  <label>Cajas cargadas en el camión<input inputMode="decimal" type="text" value={camion} onChange={e=> { setCamion(e.target.value); }} disabled={ocupado || actual?.cerrada} /></label>
  <label>Cajas a mi cargo<input inputMode="decimal" type="text" value={propias} onChange={e=> { setPropias(e.target.value); }} disabled={ocupado || actual?.cerrada} /></label>
  <p className="ayuda">Chofer y pioneta pueden registrar la misma cantidad si trabajaron juntos todo el reparto. Si te incorporaste después o cambiaste de camión, registra solo las cajas de tu participación. Cada persona acumula $15 por caja entregada.</p>
  <Boton variante="secundario" disabled={ocupado || actual?.cerrada === true} onClick={()=>void guardar()}>GUARDAR CAJAS CARGADAS</Boton>
 </>;
 return <section className="tarjeta" aria-label={cierre?'Rebajes al terminar':'Cajas de mi jornada'}>
  {cierre?<h3>¿Tienes rebajes?</h3>:<h3>Cajas de mi jornada</h3>}
  {actual===undefined && !error?<p>Consultando cajas…</p>:null}
  {cierre && actual?.registrada ? <p>Cargadas: {actual.cargadasUsuario} a tu cargo · {actual.cargadasCamion} en el camión.</p> : entradasCarga}
  {actual?.cerrada && !cierre?<p role="status">Cierre confirmado · Entregadas: {actual.cargadasUsuario-actual.porCerrado-actual.rebajes} · Descuento: ${(actual.porCerrado+actual.rebajes)*15} · Acumulado: ${(actual.cargadasUsuario-actual.porCerrado-actual.rebajes)*15}</p>:null}
  {cierre?<>
   <p>Admite decimales: 0,5 o 3,5. Deja 0 cuando no haya rebajes.</p>
   <label>Mis cajas no entregadas por cerrado<input inputMode="decimal" value={cerrado} onChange={e=> { setCerrado(e.target.value); }} disabled={ocupado || actual?.cerrada} /></label>
   <label>Mis otros rebajes (no incluir los cerrados de arriba)<input inputMode="decimal" value={rebaje} onChange={e=> { setRebaje(e.target.value); }} disabled={ocupado || actual?.cerrada} /></label>
   <label>Total físico que vuelve en el camión (cerrados + otros rebajes)<input inputMode="decimal" value={fisico} onChange={e=> { setFisico(e.target.value); }} disabled={ocupado || actual?.cerrada} /></label>
   <p className="ayuda">El total del camión se confirma con el cierre del último integrante. Tu cantidad y tu monto se guardan en tu propia jornada.</p>
   <Boton disabled={ocupado || !actual?.registrada} onClick={()=>void cerrar()}>{ocupado?'GUARDANDO…':actual?.cerrada?'CONTINUAR CON EL CIERRE':'CONFIRMAR REBAJES Y TERMINAR'}</Boton>
  </>:null}
  {error?<Aviso tipo="error">{error}</Aviso>:null}
 </section>;
};
