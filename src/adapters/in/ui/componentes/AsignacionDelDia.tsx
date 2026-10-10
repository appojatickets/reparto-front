import type { AsignacionDia } from '../../../../application/modelos';
import { nombreDeCamion } from '../../../../domain/patente';

/** Lo que dice la planilla del día de un camión: quiénes van, qué comunas hace y con qué vendedores. */
export const AsignacionDelDia = ({ a, conCamion = true }: { readonly a: Pick<AsignacionDia, 'camion' | 'chofer' | 'ayudante' | 'comunas' | 'vendedores'>; readonly conCamion?: boolean }) => (
  <>
    {conCamion ? <strong>{nombreDeCamion(a.camion)}</strong> : null}
    {a.chofer ? <span>Chofer: {a.chofer.nombre}</span> : null}
    {a.ayudante ? <span>Ayudante: {a.ayudante.nombre}</span> : null}
    {a.comunas.length > 0 ? <span>Comunas: {a.comunas.join(', ')}</span> : null}
    {a.vendedores.length > 0 ? <span>Vendedores: {a.vendedores.map((v) => `${v.codigo} ${v.nombre}`).join(' · ')}</span> : null}
  </>
);
