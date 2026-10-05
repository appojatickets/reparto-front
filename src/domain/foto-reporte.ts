/** Por qué se reporta una foto (los mismos motivos que acepta la API). */
export const MOTIVOS_FOTO = [
  { id: 'no_es_la_fachada', texto: 'No es la fachada del local' },
  { id: 'se_ven_personas', texto: 'Se ven personas' },
  { id: 'borrosa', texto: 'Está borrosa u oscura' },
  { id: 'otra', texto: 'Otro motivo' },
] as const;

export type IdMotivoFoto = (typeof MOTIVOS_FOTO)[number]['id'];

export const textoDeMotivo = (id: IdMotivoFoto): string => MOTIVOS_FOTO.find((m) => m.id === id)?.texto ?? id;

/** «5 oct, 15:58» en hora de Chile; vacío si no hay fecha. */
export const fechaYHoraEnChile = (iso: string | undefined): string => {
  if (iso === undefined) return '';
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return '';
  return new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(f);
};
