import type { Descarga } from '../../../application/ports/descarga';

/** Descarga con un enlace temporal del navegador (no sube nada a ningún servidor). */
export const crearDescargaNavegador = (): Descarga => ({
  guardarTexto: (nombre, contenido, tipo) => {
    const url = URL.createObjectURL(new Blob([contenido], { type: `${tipo};charset=utf-8` }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => { URL.revokeObjectURL(url); }, 10_000);
  },
});
