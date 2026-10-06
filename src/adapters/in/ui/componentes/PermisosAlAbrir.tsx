import { useEffect, useState } from 'react';
import type { EstadoPermisos } from '../../../../application/ports/permisos';
import { useCasos } from '../contexto';
import { Aviso } from './ui';

/**
 * Al abrir la app pide, una sola vez y sin molestar, la ubicación (llegadas y ruta) y el micrófono (dictado). No bloquea nada:
 * solo si quedó rechazado avisa qué se pierde y cómo activarlo.
 */
export const PermisosAlAbrir = () => {
  const { permisos } = useCasos();
  const [estado, setEstado] = useState<EstadoPermisos | undefined>();
  useEffect(() => {
    let vivo = true;
    permisos.pedir().then((e) => { if (vivo) setEstado(e); }, () => undefined);
    return () => { vivo = false; };
  }, [permisos]);
  if (!estado) return null;
  return (
    <>
      {estado.ubicacion === 'denegado' ? (
        <Aviso tipo="error">La ubicación está bloqueada: sin ella no se anotan las llegadas ni la ruta mejora. Actívala en el navegador (el candado junto a la dirección → Ubicación → Permitir).</Aviso>
      ) : null}
      {estado.microfono === 'denegado' ? (
        <Aviso tipo="error">El micrófono está bloqueado: no podrás dictar. Actívalo en el navegador (el candado junto a la dirección → Micrófono → Permitir).</Aviso>
      ) : null}
    </>
  );
};
