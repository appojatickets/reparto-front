import { useEffect, useState } from 'react';
import type { ApiClient } from '../../../../application/ports/api-client';
import { mensajeDeError } from '../../../../application/mensajes';
import { useCasos } from '../contexto';
import { Aviso, Boton } from './ui';
type Visita=Extract<Awaited<ReturnType<ApiClient['visitasPendientes']>>,{ok:true}>['value'][number];
export const VisitasGps=({alActualizar}:{readonly alActualizar:()=>void})=>{
 const {api}=useCasos();const [visitas,setVisitas]=useState<readonly Visita[]>([]);const [error,setError]=useState('');const [ocupado,setOcupado]=useState(false);
 useEffect(()=>{let vivo=true;const consultar=():void=>{if(document.visibilityState!=='visible')return;void api.visitasPendientes().then(r=>{if(vivo&&r.ok)setVisitas(r.value);}).catch(()=>undefined);};consultar();const t=window.setInterval(consultar,30_000);window.addEventListener('focus',consultar);return()=>{vivo=false;window.clearInterval(t);window.removeEventListener('focus',consultar);};},[api]);
 const confirmar=async(v:Visita,tipo:'entregado'|'cerrado'):Promise<void>=>{
  setOcupado(true);setError('');
  try{const r=await api.registrarEvento(v.facturaId,{tipo,sinPin:true});if(r.ok){setVisitas(lista=>lista.filter(f=>f.facturaId!==v.facturaId));alActualizar();}else setError(mensajeDeError(r.error));}catch{setError('No se pudo confirmar la visita. Reintenta.');}finally{setOcupado(false);}
 };
 if(!visitas.length&&!error)return null;
 return <section className="tarjeta" aria-label="Visitas detectadas por GPS"><h3>El GPS detectó {visitas.length} visitas pendientes de confirmar</h3><p>Si olvidaste los botones, confirma lo que pasó. La ubicación no permite saber si entregaste o estaba cerrado; tampoco cambia el pin desde donde estás ahora.</p>{visitas.map(v=><div key={v.facturaId}><p>{v.cliente} · {v.estado==='sin_confirmar'?'Te detuviste y continuaste':'Permanencia junto al local'} · {new Date(v.llegada).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}</p><div className="fila-botones"><Boton disabled={ocupado} onClick={()=>void confirmar(v,'entregado')}>CONFIRMAR ENTREGADO {v.cliente}</Boton><Boton variante="secundario" disabled={ocupado} onClick={()=>void confirmar(v,'cerrado')}>CONFIRMAR CERRADO {v.cliente}</Boton></div></div>)}{error?<Aviso tipo="error">{error}</Aviso>:null}</section>;
};
