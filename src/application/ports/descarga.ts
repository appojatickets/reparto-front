/** Entrega al teléfono o computador un archivo de texto generado en la app (se guarda en Descargas). */
export interface Descarga {
  guardarTexto(nombre: string, contenido: string, tipo: string): void;
}
