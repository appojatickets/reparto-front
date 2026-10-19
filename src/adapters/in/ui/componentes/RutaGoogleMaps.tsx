import { useState } from 'react';
import type { ParadaDeRuta } from '../../../../application/modelos';
import { prepararTramoGoogleMaps } from '../../../../domain/enlaces';
import { Aviso, Boton } from './ui';

/** El enlace siempre se deriva de la misma lista pendiente que ve el chofer. Google recibe una copia, no una conexión en vivo. */
export const RutaGoogleMaps = ({ paradas }: { readonly paradas: readonly ParadaDeRuta[] }) => {
  const [abierto, setAbierto] = useState(false);
  if (paradas.length === 0) return null;
  const tramo = prepararTramoGoogleMaps(paradas);
  const corto = prepararTramoGoogleMaps(paradas, 4);
  return <section className="pagina" aria-label="Abrir recorrido en Google Maps">
    <Boton variante="secundario" aria-expanded={abierto} onClick={() => { setAbierto(!abierto); }}>ABRIR RUTA EN GOOGLE MAPS</Boton>
    {abierto ? <div className="tarjeta">
      <p>Se envían las próximas entregas pendientes en el orden de esta lista. Si cambias el orden o marcas entregas en Reparto, vuelve a abrir Google Maps desde aquí.</p>
      {tramo ? <>
        <a className="big-button big-button--primario" href={tramo.url} target="_blank" rel="noreferrer">LAS PRÓXIMAS {tramo.cantidad} EN GOOGLE MAPS</a>
        {tramo.cantidad < Math.min(9, paradas.length) ? <Aviso>Este tramo lleva {tramo.cantidad} paradas para que el enlace no sea demasiado largo. Las demás siguen en tu lista.</Aviso> : null}
        <details className="opciones-simples"><summary>VER LAS PARADAS QUE SE ENVIARÁN</summary>
          <ol>{paradas.slice(0, tramo.cantidad).map((p) => <li key={p.facturaId}><strong>{p.cliente}</strong> · {p.direccion}, {p.comuna}{p.ubicacionAproximada ? ' · Se usará la dirección, porque el punto es aproximado.' : ''}</li>)}</ol>
        </details>
        {corto && corto.cantidad < tramo.cantidad ? <details className="opciones-simples"><summary>¿GOOGLE MUESTRA MENOS PARADAS?</summary>
          <p>En el navegador del teléfono, Google admite menos paradas. Abre el tramo corto o usa IR en cada entrega. Para el tramo completo, abre el enlace con la aplicación Google Maps.</p>
          <a className="big-button big-button--secundario" href={corto.url} target="_blank" rel="noreferrer">ABRIR SOLO LAS PRÓXIMAS {corto.cantidad}</a>
        </details> : null}
      </> : <Aviso>No se pudo preparar el recorrido. Usa IR en cada entrega y revisa las direcciones.</Aviso>}
    </div> : null}
  </section>;
};
