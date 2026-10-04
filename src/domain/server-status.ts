export type ServerStatus =
  | { readonly kind: 'checking' }
  | { readonly kind: 'waking' }
  | { readonly kind: 'ok' }
  | { readonly kind: 'degraded' }
  | { readonly kind: 'unreachable' };

/** Texto en letra grande para el chofer y el despachador. */
export const describeServerStatus = (status: ServerStatus): string => {
  switch (status.kind) {
    case 'checking':
      return 'Conectando…';
    case 'waking':
      return 'Despertando servidor… puede tardar hasta 1 minuto';
    case 'ok':
      return 'Servidor listo';
    case 'degraded':
      return 'Servidor con problemas. Avise al administrador';
    case 'unreachable':
      return 'Sin conexión';
  }
};

export const isFinal = (status: ServerStatus): boolean =>
  status.kind === 'ok' || status.kind === 'degraded' || status.kind === 'unreachable';
