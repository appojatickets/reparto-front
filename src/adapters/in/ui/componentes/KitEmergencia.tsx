import { useEffect, useId, useState } from 'react';
import { consultaDeEmergencia, enlaceBuscarAyuda, enlaceLlamar, TELEFONOS_EMERGENCIA, type TipoEmergencia } from '../../../../domain/emergencia';
import { useCasos } from '../contexto';
import { Aviso, Campo } from './ui';

/**
 * Kit de emergencia del chofer (ADR 0048 del back): siempre arriba y en rojo. Números de Carabineros, PDI, Bomberos y ambulancia, y un buscador de
 * mecánico, vulcanización u otra ayuda en Google Maps centrado donde está el camión. Al tocar una búsqueda queda anotada una parada de emergencia
 * (hora y lugar); si no se puede anotar, la búsqueda se abre igual: pedir ayuda nunca se bloquea.
 */
export const KitEmergencia = () => {
  const { api, ubicacion } = useCasos();
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState<{ lat: number; lng: number; precisionM: number } | undefined>();
  const [otra, setOtra] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'exito' | 'error'; texto: string } | undefined>();
  const panelId = useId();

  /** Al abrir el kit se toma la posición una vez, para centrar el mapa y anotar dónde está el camión. */
  useEffect(() => {
    if (!abierto || !ubicacion.disponible) return;
    let activo = true;
    void ubicacion.actual().then((r) => {
      if (activo && r.ok) setPosicion({ lat: r.value.lat, lng: r.value.lng, precisionM: r.value.precisionM });
    });
    return () => { activo = false; };
  }, [abierto, ubicacion]);

  const anotar = (tipo: TipoEmergencia, texto?: string): void => {
    void api
      .registrarEmergencia({ tipo, ...(texto !== undefined ? { texto } : {}), ...(posicion ? { lat: posicion.lat, lng: posicion.lng, precisionM: posicion.precisionM } : {}) })
      .then((r) => { setAviso(r.ok ? { tipo: 'exito', texto: 'Quedó anotada la parada de emergencia.' } : { tipo: 'error', texto: 'No se pudo anotar la parada, pero la búsqueda se abrió igual.' }); });
  };

  const busqueda = (tipo: TipoEmergencia, texto?: string) => {
    const consulta = consultaDeEmergencia(tipo, texto);
    const vacia = consulta === '';
    const etiqueta = tipo === 'mecanico' ? 'BUSCAR MECÁNICO' : tipo === 'vulcanizacion' ? 'BUSCAR VULCANIZACIÓN' : 'BUSCAR';
    // Sin nada que buscar no hay enlace: queda un botón apagado que explica qué falta.
    if (vacia) return <button key={tipo} type="button" className="big-button big-button--emergencia" aria-disabled="true" aria-label={`${etiqueta} EN GOOGLE MAPS (escribe qué buscar)`}>{etiqueta}</button>;
    return (
      <a key={tipo} className="big-button big-button--emergencia" href={enlaceBuscarAyuda(consulta, posicion)} target="_blank" rel="noreferrer" aria-label={`${etiqueta} EN GOOGLE MAPS`} onClick={() => { anotar(tipo, tipo === 'otro' ? consulta : undefined); }}>{etiqueta}</a>
    );
  };

  return (
    <section className="emergencia" aria-label="Kit de emergencia">
      <button type="button" className="emergencia-barra" aria-expanded={abierto} aria-controls={panelId} onClick={() => { setAbierto((a) => !a); setAviso(undefined); }}>
        {abierto ? 'EMERGENCIA ▲' : 'EMERGENCIA ▼'}
      </button>
      {abierto ? (
        <div id={panelId} className="emergencia-panel">
          <h2>Llamar</h2>
          <div className="fila-botones">
            {TELEFONOS_EMERGENCIA.map((t) => (
              <a key={t.nombre} className="big-button big-button--emergencia" href={enlaceLlamar(t.numero)} aria-label={`LLAMAR A ${t.nombre} AL ${t.numero}`}>{t.nombre} {t.numero}</a>
            ))}
          </div>
          <h2>Buscar ayuda cerca</h2>
          <div className="fila-botones">
            {busqueda('mecanico')}
            {busqueda('vulcanizacion')}
          </div>
          <Campo etiqueta="Otra ayuda (grúa, gomería, repuestos…)" value={otra} onChange={(e) => { setOtra(e.target.value); }} maxLength={80} />
          <div className="fila-botones">{busqueda('otro', otra)}</div>
          <p className="ayuda">{posicion ? 'Se busca cerca de donde estás. Al tocar una búsqueda queda anotada la parada con la hora y el lugar.' : 'Se busca cerca de tu teléfono. Al tocar una búsqueda queda anotada la parada con la hora.'}</p>
          {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}
        </div>
      ) : null}
    </section>
  );
};
