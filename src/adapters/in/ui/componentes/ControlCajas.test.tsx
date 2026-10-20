import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {ok} from '../../../../domain/result';
import {ControlCajas} from './ControlCajas';
const deps=vi.hoisted(()=>({api:{obtenerCajas:vi.fn(),guardarCajas:vi.fn(),cerrarCajas:vi.fn()}}));
vi.mock('../contexto',()=>({useCasos:()=>deps}));
const actual = {registrada:true,cargadasCamion:100.5,cargadasUsuario:100.5,porCerrado:0,rebajes:0,rebajesCamion:null,revision:2,cerrada:false};
beforeEach(()=>{vi.resetAllMocks();deps.api.obtenerCajas.mockResolvedValue(ok(actual));deps.api.guardarCajas.mockResolvedValue(ok(actual));deps.api.cerrarCajas.mockResolvedValue(ok(true));});
describe('cajas simples',()=>{
 it('guarda al confirmar una carga escrita al terminar, aunque no estuviera registrada',async()=>{
  deps.api.obtenerCajas.mockResolvedValue(ok(null));
  const alCerrar=vi.fn();render(<ControlCajas cierre alCerrar={alCerrar}/>);
  const carga=await screen.findByLabelText('Cajas cargadas');await waitFor(()=>expect(carga).toBeEnabled());
  await userEvent.type(carga,'200');
  await userEvent.click(screen.getByRole('button',{name:'CONFIRMAR REBAJES Y TERMINAR'}));
  expect(deps.api.guardarCajas).toHaveBeenCalledWith({cargadasCamion:200,cargadasUsuario:200,revision:0});
  expect(deps.api.cerrarCajas).toHaveBeenCalledWith({porCerrado:0,rebajes:0,rebajesCamion:0});
  expect(alCerrar).toHaveBeenCalledTimes(1);
 });
 it('permite confirmar el formulario vacío sin inventar cajas ni ganancias',async()=>{
  deps.api.obtenerCajas.mockResolvedValue(ok(null));
  const alCerrar=vi.fn();render(<ControlCajas cierre alCerrar={alCerrar}/>);
  const campo=await screen.findByLabelText('Rebajes');await waitFor(()=>expect(campo).toBeEnabled());await userEvent.clear(campo);
  await userEvent.click(screen.getByRole('button',{name:'CONFIRMAR REBAJES Y TERMINAR'}));
  expect(alCerrar).toHaveBeenCalledTimes(1);expect(deps.api.guardarCajas).not.toHaveBeenCalled();expect(deps.api.cerrarCajas).not.toHaveBeenCalled();
 });
 it('trata un rebaje vacío como cero con carga registrada',async()=>{
  const alCerrar=vi.fn();render(<ControlCajas cierre alCerrar={alCerrar}/>);
  const campo=await screen.findByLabelText('Rebajes');await waitFor(()=>expect(campo).toBeEnabled());await userEvent.clear(campo);
  await userEvent.click(screen.getByRole('button',{name:'CONFIRMAR REBAJES Y TERMINAR'}));
  expect(deps.api.cerrarCajas).toHaveBeenCalledWith({porCerrado:0,rebajes:0,rebajesCamion:0});expect(alCerrar).toHaveBeenCalledTimes(1);
 });
 it('permite omitir el control incluso si falla la consulta de cajas',async()=>{
  deps.api.obtenerCajas.mockResolvedValue({ok:false,error:{kind:'HTTP',status:500}});
  const alCerrar=vi.fn();render(<ControlCajas cierre alCerrar={alCerrar}/>);
  await userEvent.click(screen.getByRole('button',{name:'TERMINAR SIN REGISTRAR CAJAS'}));
  expect(alCerrar).toHaveBeenCalledTimes(1);expect(deps.api.guardarCajas).not.toHaveBeenCalled();expect(deps.api.cerrarCajas).not.toHaveBeenCalled();
 });
 it('si falla guardar la carga al terminar, conserva los datos y permite reintentar',async()=>{
  deps.api.obtenerCajas.mockResolvedValue(ok(null));deps.api.guardarCajas.mockResolvedValue({ok:false,error:{kind:'HTTP',status:409,mensaje:'La carga cambió'}});
  const alCerrar=vi.fn();render(<ControlCajas cierre alCerrar={alCerrar}/>);
  const campo=await screen.findByLabelText('Cajas cargadas');await waitFor(()=>expect(campo).toBeEnabled());await userEvent.type(campo,'200');
  await userEvent.click(screen.getByRole('button',{name:'CONFIRMAR REBAJES Y TERMINAR'}));
  expect(await screen.findByRole('alert')).toBeInTheDocument();expect(campo).toHaveValue('200');expect(alCerrar).not.toHaveBeenCalled();expect(deps.api.cerrarCajas).not.toHaveBeenCalled();
 });

 it('pide solo la carga y envía el mismo total para camión y jornada',async()=>{
  render(<ControlCajas/>);const carga=await screen.findByLabelText('Cajas cargadas');
  await waitFor(()=>expect(carga).toHaveValue('100.5'));expect(screen.getAllByRole('textbox')).toHaveLength(1);
  expect(screen.queryByText('Cajas a mi cargo')).not.toBeInTheDocument();
  await userEvent.clear(carga);await userEvent.type(carga,'80,5');
  await userEvent.click(screen.getByRole('button',{name:'GUARDAR CAJAS CARGADAS'}));
  expect(deps.api.guardarCajas).toHaveBeenCalledWith({cargadasCamion:80.5,cargadasUsuario:80.5,revision:2});
 });
 it('un único rebaje calcula entrega efectiva y ganancia; solo cierra al confirmar',async()=>{
  const alCerrar=vi.fn();render(<ControlCajas cierre alCerrar={alCerrar}/>);
  const rebajes=await screen.findByLabelText('Rebajes');await waitFor(()=>expect(rebajes).toBeEnabled());
  expect(screen.getAllByRole('textbox')).toHaveLength(1);
  await userEvent.clear(rebajes);await userEvent.type(rebajes,'4,5');
  expect(screen.getByText('96')).toBeInTheDocument();expect(screen.getByText(/1\.440/)).toBeInTheDocument();expect(alCerrar).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button',{name:'CONFIRMAR REBAJES Y TERMINAR'}));
  expect(deps.api.cerrarCajas).toHaveBeenCalledWith({porCerrado:0,rebajes:4.5,rebajesCamion:4.5});expect(alCerrar).toHaveBeenCalledTimes(1);
 });
 it.each(['-1','101','abc','0,001'])('rechaza rebajes inválidos %s sin cerrar',async(valor)=>{
  const alCerrar=vi.fn();render(<ControlCajas cierre alCerrar={alCerrar}/>);
  const campo=await screen.findByLabelText('Rebajes');await waitFor(()=>expect(campo).toBeEnabled());await userEvent.clear(campo);await userEvent.type(campo,valor);
  await userEvent.click(screen.getByRole('button',{name:'CONFIRMAR REBAJES Y TERMINAR'}));
  expect(deps.api.cerrarCajas).not.toHaveBeenCalled();expect(alCerrar).not.toHaveBeenCalled();expect(screen.getByRole('alert')).toHaveTextContent('Los rebajes');
 });
 it('si falla guardar no cierra la ruta y conserva la entrada',async()=>{
  deps.api.cerrarCajas.mockResolvedValue({ok:false,error:{kind:'HTTP',status:422,mensaje:'No se pudo cerrar.'}});
  const alCerrar=vi.fn();render(<ControlCajas cierre alCerrar={alCerrar}/>);
  const campo=await screen.findByLabelText('Rebajes');await waitFor(()=>expect(campo).toBeEnabled());await userEvent.clear(campo);await userEvent.type(campo,'3.5');
  await userEvent.click(screen.getByRole('button',{name:'CONFIRMAR REBAJES Y TERMINAR'}));expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cerrar');expect(campo).toHaveValue('3.5');expect(alCerrar).not.toHaveBeenCalled();
 });
 it('continúa un cierre antiguo sin reclasificar descuentos',async()=>{
  deps.api.obtenerCajas.mockResolvedValue(ok({...actual,porCerrado:0.5,rebajes:3.5,cerrada:true}));
  render(<ControlCajas cierre/>);await userEvent.click(await screen.findByRole('button',{name:'CONTINUAR CON EL CIERRE'}));
  expect(deps.api.cerrarCajas).toHaveBeenCalledWith({porCerrado:0.5,rebajes:3.5,rebajesCamion:4});
 });
});
