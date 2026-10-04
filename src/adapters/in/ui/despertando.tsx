import { useEffect, useState } from 'react';

export const EVENTO_SERVIDOR_DESPERTANDO = 'reparto:servidor-despertando';

/** Franja visible mientras la API (Render Free, dormida) tarda en responder y se reintenta sola. */
export const AvisoServidorDespertando = () => {
  const [activo, setActivo] = useState(false);
  useEffect(() => {
    const alCambiar = (e: Event): void => {
      setActivo((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener(EVENTO_SERVIDOR_DESPERTANDO, alCambiar);
    return () => {
      window.removeEventListener(EVENTO_SERVIDOR_DESPERTANDO, alCambiar);
    };
  }, []);
  return activo ? <p role="status" className="aviso aviso--info franja">Despertando servidor… puede tardar hasta 1 minuto. No cierres la aplicación.</p> : null;
};
