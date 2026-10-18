import { useEffect, useState } from 'react';
import { minutosEnChile } from '../../../../domain/fechas';
import { ETIQUETA_EMERGENCIA } from '../../../../domain/emergencia';
import { horaDelDia } from '../../../../domain/hora';
import type { ParadaEmergencia } from '../../../../application/modelos';
import { useCasos } from '../contexto';

/** Las paradas de emergencia del día junto a lo hecho: se ve cuándo y dónde se paró a buscar ayuda. No son entregas. */
export const EmergenciasDelDia = ({ camionId, fecha, version }: { readonly camionId: string; readonly fecha: string; readonly version: unknown }) => {
  const { api } = useCasos();
  const [lista, setLista] = useState<readonly ParadaEmergencia[]>([]);
  useEffect(() => {
    let activo = true;
    void api.listarEmergencias(fecha, camionId).then((r) => { if (activo && r.ok) setLista(r.value); });
    return () => { activo = false; };
  }, [api, camionId, fecha, version]);
  if (lista.length === 0) return null;
  return (
    <section className="pagina" aria-label="Paradas de emergencia">
      <h2>Paradas de emergencia ({lista.length})</h2>
      <ul className="paradas">
        {lista.map((e) => (
          <li key={e.id} className="parada parada--emergencia">
            <span className="parada-nombre">
              <strong>{horaDelDia(minutosEnChile(new Date(e.creadoEn)))} · {ETIQUETA_EMERGENCIA[e.tipo]}{e.texto ? `: ${e.texto}` : ''}</strong>
              <span className="comuna">{e.precisionM !== undefined && e.precisionM <= 100 ? 'Lugar verificado con el GPS.' : 'Sin GPS preciso.'}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};
