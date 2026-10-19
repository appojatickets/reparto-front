import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {ok} from '../../../../domain/result';
import {ControlCajas} from './ControlCajas';
const deps=vi.hoisted(()=>({api:{obtenerCajas:vi.fn(),guardarCajas:vi.fn(),cerrarCajas:vi.fn()}}));
vi.mock('../contexto',()=>({useCasos:()=>deps}));
beforeEach(()=>{vi.resetAllMocks();deps.api.obtenerCajas.mockResolvedValue(ok({registrada:true,cargadasCamion:100.5,cargadasUsuario:100.5,porCerrado:0,rebajes:0,rebajesCamion:null,revision:2,cerrada:false}));deps.api.cerrarCajas.mockResolvedValue(ok(true));});
describe('rebajes al terminar el reparto',()=>{
 it('admite coma y punto, guarda ambos descuentos y solo termina tras confirmarlos',async()=>{
  const alCerrar=vi.fn();render(<ControlCajas cierre alCerrar={alCerrar}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'CONFIRMAR REBAJES Y TERMINAR'})).toBeEnabled());expect(alCerrar).not.toHaveBeenCalled();
  const cerrado=screen.getByLabelText('Mis cajas no entregadas por cerrado');await userEvent.clear(cerrado);await userEvent.type(cerrado,'0,5');
  const rebajes=screen.getByLabelText('Mis otros rebajes (no incluir los cerrados de arriba)');await userEvent.clear(rebajes);await userEvent.type(rebajes,'3.5');
  const camion=screen.getByLabelText('Total físico que vuelve en el camión (cerrados + otros rebajes)');await userEvent.clear(camion);await userEvent.type(camion,'4');
  await userEvent.click(screen.getByRole('button',{name:'CONFIRMAR REBAJES Y TERMINAR'}));
  expect(deps.api.cerrarCajas).toHaveBeenCalledWith({porCerrado:0.5,rebajes:3.5,rebajesCamion:4});expect(alCerrar).toHaveBeenCalledTimes(1);
 });
 it('si falla guardar no cierra la ruta y conserva la entrada',async()=>{
  deps.api.cerrarCajas.mockResolvedValue({ok:false,error:{kind:'HTTP',status:422,mensaje:'Rebajes mayores a la carga.'}});
  const alCerrar=vi.fn();render(<ControlCajas cierre alCerrar={alCerrar}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'CONFIRMAR REBAJES Y TERMINAR'})).toBeEnabled());await userEvent.click(screen.getByRole('button',{name:'CONFIRMAR REBAJES Y TERMINAR'}));expect(await screen.findByRole('alert')).toHaveTextContent('Rebajes mayores a la carga');expect(alCerrar).not.toHaveBeenCalled();
 });
});
