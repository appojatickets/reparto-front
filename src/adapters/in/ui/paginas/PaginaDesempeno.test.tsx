import {render,screen} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {ok} from '../../../../domain/result';
import {PaginaDesempeno} from './PaginaDesempeno';
const deps=vi.hoisted(()=>({api:{desempenoCajas:vi.fn()},ahora:()=>new Date('2026-10-19T15:00:00Z'),usuario:{id:'u1',rol:'admin'}}));
vi.mock('../contexto',()=>({useCasos:()=>deps}));vi.mock('../sesion',()=>({useUsuario:()=>deps.usuario}));
const fila=(usuarioId:string)=>({jornadaId:usuarioId,usuarioId,usuario:usuarioId,camionId:'k',camion:'ABCD12',fecha:'2026-10-19',desde:'2026-10-19T12:00:00Z',hasta:'2026-10-19T15:00:00Z',cargadas:100.5,porCerrado:0.5,rebajes:3.5,tarifa:15,cerrada:true,cargaId:'carga-unica',cargadasCamion:100.5,rebajesCamion:4,km:10,kmCamion:10,comunas:['Maipú']});
beforeEach(()=>{vi.resetAllMocks();deps.usuario.rol='admin';});
describe('desempeño de personas y camiones',()=>{
 it('suma pago de ambas personas pero muestra una sola carga y trayectoria física',async()=>{
  deps.api.desempenoCajas.mockResolvedValue(ok([fila('u1'),fila('u2')]));render(<PaginaDesempeno/>);
  expect(await screen.findByText(/193 cajas entregadas/)).toHaveTextContent('$2.895');
  expect(screen.getByText(/100.5 cargadas/)).toHaveTextContent('96.5 entregadas con cierre');expect(screen.getByText(/100.5 cargadas/)).toHaveTextContent('10 km GPS físicos');
 });
 it('el usuario ve su acumulado y no las secciones administrativas',async()=>{
  deps.usuario.rol='chofer';deps.api.desempenoCajas.mockResolvedValue(ok([fila('u1')]));render(<PaginaDesempeno/>);
  expect(await screen.findByText(/96.5 cajas entregadas/)).toHaveTextContent('$1.447,5');expect(screen.queryByRole('heading',{name:'Personas'})).toBeNull();expect(screen.queryByText(/carga física sin duplicar/)).toBeNull();
 });
});
