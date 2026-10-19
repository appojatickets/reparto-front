import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe,expect,it,vi} from 'vitest';
import {ok} from '../../../../domain/result';
import {VisitasGps} from './VisitasGps';
const deps=vi.hoisted(()=>({api:{visitasPendientes:vi.fn(),registrarEvento:vi.fn()}}));vi.mock('../contexto',()=>({useCasos:()=>deps}));
describe('confirmación de visitas observadas',()=>{it('requiere confirmar entrega y no mueve el pin al lugar donde ya avanzó el camión',async()=>{
 deps.api.visitasPendientes.mockResolvedValue(ok([{facturaId:'f1',localId:'l1',cliente:'Local Uno',llegada:'2026-10-19T12:00:00Z',estado:'sin_confirmar'}]));deps.api.registrarEvento.mockResolvedValue(ok({estado:'entregada',pinFijado:false}));const actualizar=vi.fn();render(<VisitasGps alActualizar={actualizar}/>);
 const boton=await screen.findByRole('button',{name:'CONFIRMAR ENTREGADO Local Uno'});expect(deps.api.registrarEvento).not.toHaveBeenCalled();await userEvent.click(boton);expect(deps.api.registrarEvento).toHaveBeenCalledWith('f1',{tipo:'entregado',sinPin:true});expect(actualizar).toHaveBeenCalledTimes(1);
});});
