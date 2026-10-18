import { useEffect, useState } from 'react';
import type { ApiClient } from '../../../../application/ports/api-client';
import { useCasos } from '../contexto';

type Tamano = 'mini' | 'chico' | 'mediano' | 'grande';

/** Las iniciales para cuando no hay foto: «Juan Pérez» → «JP», «Ana» → «A». */
export const inicialesDe = (nombre: string): string =>
  nombre.trim().split(/\s+/).filter((p) => p !== '').slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || '?';

type Entrada = { readonly url: string; readonly hasta: number };
const EXPIRA_ANTES_MS = 30_000;
const vigentes = new Map<string, Entrada>();
const enCurso = new Map<string, Promise<string | undefined>>();

/** Para las pruebas: olvida las URL ya pedidas. */
export const olvidarFotosDePerfil = (): void => {
  vigentes.clear();
  enCurso.clear();
};

/**
 * La URL firmada de la foto de alguien. Se recuerda mientras no venza y se pide una sola vez aunque muchas filas la necesiten;
 * si la persona cambia su foto (`fotoEn` distinto) se pide otra. Sin `fotoEn` no se pide nada.
 */
const pedirUrl = (api: ApiClient, id: string, fotoEn: string, ahora: number): Promise<string | undefined> => {
  const clave = `${id}|${fotoEn}`;
  const guardada = vigentes.get(clave);
  if (guardada && guardada.hasta > ahora) return Promise.resolve(guardada.url);
  const pendiente = enCurso.get(clave);
  if (pendiente) return pendiente;
  const p = api.urlFotoUsuario(id).then(
    (r) => {
      enCurso.delete(clave);
      if (!r.ok) return undefined;
      vigentes.set(clave, { url: r.value.url, hasta: ahora + r.value.expiraEnSegundos * 1000 - EXPIRA_ANTES_MS });
      return r.value.url;
    },
    () => {
      enCurso.delete(clave);
      return undefined;
    },
  );
  enCurso.set(clave, p);
  return p;
};

/**
 * La foto de perfil de una persona, redonda y del tamaño que se pida; sin foto (o si no carga), sus iniciales.
 * Es solo un adorno junto al nombre: no se lee en voz alta (el nombre ya está al lado).
 */
export const Avatar = ({ usuarioId, nombre, fotoEn, tamano = 'chico' }: { readonly usuarioId: string; readonly nombre: string; readonly fotoEn?: string | undefined; readonly tamano?: Tamano }) => {
  const { api, ahora } = useCasos();
  const [resuelta, setResuelta] = useState<{ readonly clave: string; readonly url: string | undefined } | undefined>();
  const clave = fotoEn !== undefined ? `${usuarioId}|${fotoEn}` : undefined;

  useEffect(() => {
    if (fotoEn === undefined) return;
    const vigente = { activo: true };
    void pedirUrl(api, usuarioId, fotoEn, ahora().getTime()).then((url) => {
      if (vigente.activo) setResuelta({ clave: `${usuarioId}|${fotoEn}`, url });
    });
    return () => { vigente.activo = false; };
  }, [api, ahora, usuarioId, fotoEn]);

  const url = clave !== undefined && resuelta?.clave === clave ? resuelta.url : undefined;
  return (
    <span className={`avatar avatar--${tamano}`} aria-hidden="true">
      {url !== undefined ? (
        <img
          src={url}
          alt=""
          onError={() => {
            vigentes.delete(`${usuarioId}|${fotoEn ?? ''}`);
            setResuelta({ clave: clave ?? '', url: undefined });
          }}
        />
      ) : (
        inicialesDe(nombre)
      )}
    </span>
  );
};
