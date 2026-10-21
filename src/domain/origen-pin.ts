export const describirOrigenPin = (p: { readonly pinFuente?: string; readonly pinVerificado?: boolean; readonly pinVerificacion?: 'persona' | 'entregas'; readonly ubicacionAproximada?: boolean }): string | undefined => {
  if (p.pinVerificado && p.pinVerificacion === 'entregas') return 'Confirmado por entregas';
  if (p.pinFuente === 'gemini') return p.pinVerificado ? 'Fijado por Gemini · verificado' : 'Fijado por Gemini · pendiente de verificar';
  return p.ubicacionAproximada ? 'Ubicación estimada' : undefined;
};
