import { useCallback, useState } from 'react';
import { resumenDeQuienesAportaron, textoDeAportes } from '../../../../domain/aportes';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { Avatar } from './Avatar';

/**
 * Quiénes aportaron a un local completo (con foto y pin, y más de una entrega o el pin verificado): una fila chica con sus fotos de perfil
 * y nombres que, al tocarla, muestra a cada uno con lo que aportó. Es un reconocimiento discreto: si el local aún no cumple (o no carga),
 * no muestra nada.
 */
export const Contribuyentes = ({ localId }: { readonly localId: string }) => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.contribuyentesDeLocal(localId), [api, localId]);
  const { estado } = useCarga(cargar);
  const [abierto, setAbierto] = useState(false);
  if (estado.tipo !== 'ok' || estado.datos.length === 0) return null;
  const gente = estado.datos;
  const id = `aportes-${localId}`;
  return (
    <div className="aportes">
      <button type="button" className="aportes-fila" aria-expanded={abierto} aria-controls={id} onClick={() => { setAbierto(!abierto); }}>
        <span className="aportes-caras" aria-hidden="true">
          {gente.slice(0, 3).map((c) => <Avatar key={c.usuarioId} usuarioId={c.usuarioId} nombre={c.nombre} fotoEn={c.fotoEn} tamano="mini" />)}
        </span>
        <span>Aportaron: <strong>{resumenDeQuienesAportaron(gente.map((c) => c.nombre))}</strong></span>
      </button>
      {abierto ? (
        <ul className="aportes-lista" id={id} aria-label="Quiénes aportaron a este local">
          {gente.map((c) => (
            <li key={c.usuarioId}>
              <Avatar usuarioId={c.usuarioId} nombre={c.nombre} fotoEn={c.fotoEn} tamano="chico" />
              <span>
                <strong>{c.nombre}</strong>
                <span className="ayuda">{textoDeAportes(c.aportes, c.entregas)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
