import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';
import { mensajeDeError } from '../../../../application/mensajes';
import type { ApiError } from '../../../../application/ports/api-client';

export const Pagina = ({ titulo, children }: { readonly titulo: string; readonly children: ReactNode }) => (
  <section className="pagina">
    <h1>{titulo}</h1>
    {children}
  </section>
);

type Variante = 'primario' | 'secundario' | 'peligro';
export const Boton = ({ variante = 'primario', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { readonly variante?: Variante }) => (
  <button type="button" className={`big-button big-button--${variante} ${className}`.trim()} {...props} />
);

type CampoProps = { readonly etiqueta: string; readonly ayuda?: string; readonly error?: string | undefined };

export const Campo = ({ etiqueta, ayuda, error, ...props }: CampoProps & InputHTMLAttributes<HTMLInputElement>) => {
  const id = useId();
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      {ayuda ? <span id={`${id}-ayuda`} className="ayuda">{ayuda}</span> : null}
      <input id={id} aria-describedby={ayuda ? `${id}-ayuda` : undefined} aria-invalid={error ? true : undefined} {...props} />
      {error ? <span role="alert" className="error-campo">{error}</span> : null}
    </div>
  );
};

export const AreaTexto = ({ etiqueta, ayuda, ...props }: CampoProps & TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const id = useId();
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      {ayuda ? <span id={`${id}-ayuda`} className="ayuda">{ayuda}</span> : null}
      <textarea id={id} aria-describedby={ayuda ? `${id}-ayuda` : undefined} {...props} />
    </div>
  );
};

export const Selector = ({ etiqueta, children, ...props }: { readonly etiqueta: string; readonly children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) => {
  const id = useId();
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <select id={id} {...props}>{children}</select>
    </div>
  );
};

/** Errores y avisos: nunca solo con color (texto + borde grueso), y los errores se anuncian al lector de pantalla. */
export const Aviso = ({ tipo = 'info', children }: { readonly tipo?: 'info' | 'error' | 'exito'; readonly children: ReactNode }) => (
  <p role={tipo === 'error' ? 'alert' : 'status'} className={`aviso aviso--${tipo}`}>{children}</p>
);

export const Cargando = ({ texto = 'Cargando…' }: { readonly texto?: string }) => (
  <p role="status" className="aviso aviso--info">{texto}</p>
);

export const ErrorCarga = ({ error, alReintentar }: { readonly error: ApiError; readonly alReintentar?: () => void }) => (
  <div>
    <Aviso tipo="error">{mensajeDeError(error)}</Aviso>
    {alReintentar ? <Boton onClick={alReintentar}>REINTENTAR</Boton> : null}
  </div>
);

export const Insignia = ({ children }: { readonly children: ReactNode }) => <span className="insignia">{children}</span>;
