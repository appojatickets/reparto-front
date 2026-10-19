import { useEffect, useState } from 'react';
import type { DesempenoCajas } from '../../../../application/modelos';
import { mensajeDeError } from '../../../../application/mensajes';
import { useCasos } from '../contexto';
import { useUsuario } from '../sesion';
import { Aviso, Pagina } from '../componentes/ui';
const pesos = (n:number):string => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:2}).format(n);
const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
export const PaginaDesempeno = () => {
 const {api,ahora}=useCasos();const usuario=useUsuario();
 const [mes,setMes]=useState(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit'}).format(ahora()).slice(0,7));
 const [cargando,setCargando]=useState(true);
 const [filas,setFilas]=useState<readonly DesempenoCajas[]>([]);const [error,setError]=useState('');
 useEffect(()=>{let vivo=true;void api.desempenoCajas(mes).then(r=>{if(!vivo)return;setCargando(false);if(r.ok){setFilas(r.value);setError('');}else setError(mensajeDeError(r.error));}).catch(()=>{if(vivo){setCargando(false);setError('No se pudo cargar el desempeño.');}});return()=>{vivo=false;};},[api,mes]);
 const admin=usuario.rol==='admin'; const cerradas=filas.filter(f=>f.cerrada);
 const entregadas=(f:DesempenoCajas):number=>Math.round((f.cargadas-f.porCerrado-f.rebajes)*100)/100;
 const sum=(fn:(f:DesempenoCajas)=>number):number=>Math.round(cerradas.reduce((n,f)=>n+fn(f),0)*100)/100;
 const tiempo=(f:DesempenoCajas):number=>f.hasta?Math.max(0,(Date.parse(f.hasta)-Date.parse(f.desde))/60000):0;
 const porDia=dias.map((nombre,dia)=>{const grupo=filas.filter(f=>f.hasta&&new Date(`${f.fecha}T12:00:00Z`).getUTCDay()===dia);return{nombre,n:grupo.length,min:grupo.length?grupo.reduce((n,f)=>n+tiempo(f),0)/grupo.length:0};}).filter(d=>d.n>0).sort((a,b)=>a.min-b.min);
 const cargas=[...new Map(filas.filter(f=>f.cargaId).map(f=>[f.cargaId,f])).values()];
 const personas=[...new Set(filas.map(f=>f.usuarioId))];const camiones=[...new Set(filas.map(f=>f.camionId))];
 return <Pagina titulo={admin?'Desempeño del equipo y camiones':'Mi desempeño'}>
  <label>Mes<input type="month" value={mes} onChange={e=>{if(e.target.value){setMes(e.target.value);setFilas([]);setCargando(true);}}} /></label>
  {error?<Aviso tipo="error">{error}</Aviso>:null}
  {cargando?<p role="status">Consultando desempeño…</p>:error?null:<>
  <div className="tarjeta"><h3>{admin?'Acumulado de las personas':'Mi acumulado confirmado'}</h3><p>{sum(entregadas)} cajas entregadas · {pesos(sum(f=>entregadas(f)*f.tarifa))}</p><p>Descuentos: {sum(f=>f.porCerrado+f.rebajes)} cajas · {pesos(sum(f=>(f.porCerrado+f.rebajes)*f.tarifa))}</p><p>{filas.length} jornadas · {filas.filter(f=>!f.cerrada).length} sin cierre de cajas · {Math.round(filas.reduce((n,f)=>n+f.km,0)*10)/10} km observados por GPS</p><p className="ayuda">Los montos cuentan solo cierres confirmados. El GPS no demuestra una entrega ni determina cuántas cajas se entregaron. Los km son cobertura observada, no un odómetro completo.</p></div>
  {porDia.length?<div className="tarjeta"><h3>Tiempo por día de semana</h3><p>Menor promedio: {porDia[0]?.nombre} · {Math.round(porDia[0]?.min??0)} min. Mayor promedio: {porDia.at(-1)?.nombre} · {Math.round(porDia.at(-1)?.min??0)} min.</p>{porDia.map(d=><p key={d.nombre}>{d.nombre}: {Math.round(d.min)} min · {d.n} jornadas terminadas.</p>)}<p className="ayuda">Duración entre inicio y término registrados; jornadas de tamaños y comunas diferentes no son comparables como productividad.</p></div>:null}
  {admin?<><section className="tarjeta"><h3>Personas</h3>{personas.map(id=>{const g=filas.filter(f=>f.usuarioId===id);return <p key={id}>{g[0]?.usuario}: {g.filter(f=>f.cerrada).reduce((n,f)=>n+entregadas(f),0)} cajas · {pesos(g.filter(f=>f.cerrada).reduce((n,f)=>n+entregadas(f)*f.tarifa,0))} · Camiones: {[...new Set(g.map(f=>f.camion))].join(', ')}</p>;})}</section><section className="tarjeta"><h3>Camiones · carga física sin duplicar por integrantes</h3>{camiones.map(id=>{const g=cargas.filter(f=>f.camionId===id);const personasCamion=[...new Set(filas.filter(f=>f.camionId===id).map(f=>f.usuario))];return <p key={id}>{filas.find(f=>f.camionId===id)?.camion}: {g.reduce((n,f)=>n+f.cargadasCamion,0)} cargadas · {g.filter(f=>f.rebajesCamion!==null).reduce((n,f)=>n+(f.rebajesCamion??0),0)} rebajadas · {g.filter(f=>f.rebajesCamion!==null).reduce((n,f)=>n+f.cargadasCamion-(f.rebajesCamion??0),0)} entregadas con cierre · {Math.round([...new Map(filas.filter(f=>f.camionId===id).map(f=>[f.fecha,f.kmCamion??0])).values()].reduce((n,km)=>n+km,0)*10)/10} km GPS físicos (sin duplicar teléfonos) · Equipo: {personasCamion.join(', ')} · Comunas: {[...new Set(filas.filter(f=>f.camionId===id).flatMap(f=>f.comunas))].join(', ')||'Sin visitas registradas'}</p>;})}</section></>:null}
  <h3>Historial por jornada</h3>{filas.length===0?<p>Todavía no hay jornadas para este mes.</p>:filas.map(f=><details className="tarjeta" key={f.jornadaId}><summary>{f.fecha} · {f.camion}{admin?` · ${f.usuario}`:''} · {f.cerrada?`${entregadas(f)} cajas · ${pesos(entregadas(f)*f.tarifa)}`:'Cajas sin cerrar'}</summary><p>Bultos del camión: {f.bultosCamion ?? 'Sin registrar'} · Cargadas a cargo: {f.cargadas} · Cerrados: {f.porCerrado} · Otros rebajes: {f.rebajes}</p><p>{f.hasta?`${Math.round(tiempo(f))} min de jornada`:'Jornada sin término registrado'} · {Math.round(f.km*10)/10} km GPS · {f.comunas.join(', ')||'Sin comunas observadas'}</p></details>)}
  </>}
 </Pagina>;
};
