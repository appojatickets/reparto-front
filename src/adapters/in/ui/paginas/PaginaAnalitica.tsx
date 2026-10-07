import { useCallback, useState } from 'react';
import { aQuienAplica, textoDeFuentePin, diferenciaPromedio, kilometros, nivelDeConfianza, proporcion, textoDeDiferencia, textoDeHoras, textoDeRitmo } from '../../../../domain/analitica';
import { fechaYHoraEnChile } from '../../../../domain/foto-reporte';
import { mensajeDeError } from '../../../../application/mensajes';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { Aviso, Boton, Cargando, ErrorCarga, Pagina } from '../componentes/ui';

const Dato = ({ titulo, valor, ayuda }: { readonly titulo: string; readonly valor: string; readonly ayuda?: string }) => (
  <li className="tarjeta">
    <span>{titulo}</span>
    <strong>{valor}</strong>
    {ayuda ? <span className="ayuda">{ayuda}</span> : null}
  </li>
);

/**
 * Panel del admin: qué datos se están guardando (y con qué calidad), qué aprendió el sistema y cuánto se parece la ruta que sugirió
 * a la que se manejó. Es solo para mirar: el análisis corre solo en segundo plano; aquí se puede pedir uno ahora.
 */
export const PaginaAnalitica = () => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.analitica(), [api]);
  const { estado, recargar, refrescar } = useCarga(cargar);
  const [analizando, setAnalizando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | undefined>();

  const analizarAhora = async (): Promise<void> => {
    setAnalizando(true);
    setMensaje(undefined);
    const r = await api.ejecutarAnalisis();
    setAnalizando(false);
    if (r.ok) {
      setMensaje({ tipo: 'exito', texto: `Listo: se revisaron ${r.value.eventos} avisos de ${r.value.jornadas} jornadas y quedaron ${r.value.parametros} valores aprendidos.` });
      refrescar();
    } else setMensaje({ tipo: 'error', texto: mensajeDeError(r.error) });
  };

  return (
    <Pagina titulo="Analítica">
      <p>Lo que el sistema guarda de cada reparto y lo que aprende de eso para ordenar mejor las rutas. Todo es cálculo con tus propios datos (últimos 30 días); no se muestran horas de llegada.</p>
      {estado.tipo === 'cargando' ? <Cargando /> : null}
      {estado.tipo === 'error' ? <ErrorCarga error={estado.error} alReintentar={recargar} /> : null}
      {estado.tipo === 'ok' ? (() => {
        const p = estado.datos;
        const c = p.cobertura;
        const dif = diferenciaPromedio(p.calidad);
        return (
          <>
            <h2>Qué datos se están guardando</h2>
            <ul className="tarjetas">
              <Dato titulo="Jornadas" valor={`${c.jornadas}`} ayuda={`${c.jornadasTerminadas} terminadas con TERMINAR RUTA`} />
              <Dato titulo="Avisos desde la parada" valor={`${c.avisos}`} ayuda={`${proporcion(c.avisosConGps, c.avisos)} con ubicación`} />
              <Dato titulo="Paradas con «llegué» (aprendizaje de atención)" valor={proporcion(c.paradasConLlegada, c.paradasResueltas)} ayuda={`${c.avisosAutomaticos} llegadas las detectó el sistema solo.${p.ultimaEjecucion && p.ultimaEjecucion.resumen.llegadasDeducidas > 0 ? ` Otras ${p.ultimaEjecucion.resumen.llegadasDeducidas} las dedujo del recorrido del camión.` : ''}`} />
              <Dato titulo="Recorrido del camión" valor={`${c.puntosGps} puntos`} ayuda={c.ultimoPuntoGps ? `El último: ${fechaYHoraEnChile(c.ultimoPuntoGps)}` : 'Aún no llegan puntos: el chofer debe tener la app abierta y dar permiso de ubicación.'} />
              <Dato titulo="Cambios a la ruta" valor={`${c.operacionesRuta}`} ayuda={`${c.correccionesManuales} los hizo una persona (subir, bajar, ir primero, quitar)`} />
            </ul>

            <h2>Qué aprendió</h2>
            {p.ultimaEjecucion ? <p className="ayuda">Último análisis: {fechaYHoraEnChile(p.ultimaEjecucion.terminadoEn)}.</p> : <Aviso>Todavía no hay un análisis. Corre solo después de terminar una ruta y cada pocas horas.</Aviso>}
            <Boton variante="secundario" disabled={analizando} onClick={() => void analizarAhora()}>{analizando ? 'ANALIZANDO…' : 'ANALIZAR AHORA'}</Boton>
            {mensaje ? <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso> : null}

            {p.aprendido.ritmo.length === 0 && p.aprendido.capacidad.length === 0 && !p.aprendido.servicioGeneral && p.aprendido.localesLentos.length === 0 ? (
              <Aviso>Aún no hay suficientes rutas reales para aprender. Mientras tanto la ruta usa valores de respaldo.</Aviso>
            ) : null}

            {p.aprendido.ritmo.length > 0 ? (
              <>
                <h3>Qué tan rápido anda cada camión</h3>
                <ul className="tarjetas">
                  {p.aprendido.ritmo.map((r) => <Dato key={r.ambito} titulo={aQuienAplica(r)} valor={textoDeRitmo(r.valor)} ayuda={`${r.muestras} tramos · confianza ${nivelDeConfianza(r.confianza)}`} />)}
                </ul>
              </>
            ) : null}

            {p.aprendido.servicioGeneral ? (
              <>
                <h3>Cuánto se demora una entrega</h3>
                <ul className="tarjetas">
                  <Dato titulo="En general" valor={`${Math.round(p.aprendido.servicioGeneral.valor)} min`} ayuda={`${p.aprendido.servicioGeneral.muestras} entregas medidas`} />
                </ul>
              </>
            ) : null}

            {p.aprendido.localesLentos.length > 0 ? (
              <>
                <h3>Locales que más demoran</h3>
                <ul className="tarjetas">
                  {p.aprendido.localesLentos.map((l) => (
                    <Dato key={l.ambito} titulo={l.etiqueta ? `${l.etiqueta.razonSocial} · ${l.etiqueta.comuna}` : l.ambito} valor={`${Math.round(l.valor)} min`} ayuda={`${l.etiqueta?.direccion ?? ''} ${l.muestras} visitas · confianza ${nivelDeConfianza(l.confianza)}`.trim()} />
                  ))}
                </ul>
              </>
            ) : null}

            {p.aprendido.capacidad.length > 0 ? (
              <>
                <h3>Cuántas entregas caben en una jornada</h3>
                <ul className="tarjetas">
                  {p.aprendido.capacidad.map((r) => (
                    <Dato key={`${r.clave}-${r.ambito}`} titulo={`${aQuienAplica(r)} · ${r.clave === 'capacidad_paradas' ? 'entregas' : 'duración'}`} valor={r.clave === 'capacidad_paradas' ? `${Math.round(r.valor)} entregas` : `${Math.floor(r.valor / 60)} h ${Math.round(r.valor % 60)} min`} ayuda={`${r.muestras} jornadas`} />
                  ))}
                </ul>
              </>
            ) : null}

            <h2>La ruta sugerida frente a la manejada</h2>
            {p.calidad.length === 0 ? (
              <Aviso>Se compara cuando hay jornadas terminadas con al menos 3 entregas avisadas desde la parada.</Aviso>
            ) : (
              <>
                {dif !== undefined ? <Aviso tipo={dif > 0.05 ? 'error' : 'exito'}>{textoDeDiferencia(dif)}</Aviso> : null}
                <ul className="tarjetas">
                  {p.calidad.map((q) => (
                    <Dato key={`${q.fecha}-${q.camionId}`} titulo={`${q.fecha} · ${q.camion ?? 'camión'}`} valor={`${kilometros(q.distSugeridaM)} sugerido · ${kilometros(q.distRealM)} manejado`} ayuda={`${q.inversiones} cambios de orden respecto de lo sugerido`} />
                  ))}
                </ul>
              </>
            )}

            {p.pinesDudosos.length > 0 ? (
              <>
                <h2>Entregas avisadas lejos del pin</h2>
                <p>Se avisó ENTREGADO con buen GPS lejos de donde está el pin del local: o el pin está mal, o se avisó desde otro lado. Revisa estos pines primero.</p>
                <ul className="tarjetas">
                  {p.pinesDudosos.map((d) => (
                    <Dato key={d.localId} titulo={d.etiqueta ? `${d.etiqueta.razonSocial} · ${d.etiqueta.comuna}` : d.localId} valor={`a ${d.distanciaM >= 1000 ? kilometros(d.distanciaM) : `${d.distanciaM} m`} del pin`} ayuda={`${d.visitas} ${d.visitas === 1 ? 'entrega' : 'entregas'}${d.fuente ? ` · el pin vino de: ${textoDeFuentePin(d.fuente)}` : ''}`} />
                  ))}
                </ul>
              </>
            ) : null}

            {p.cierres.length > 0 ? (
              <>
                <h2>Locales encontrados cerrados</h2>
                <ul className="tarjetas">
                  {p.cierres.map((x) => (
                    <Dato key={x.localId} titulo={x.etiqueta ? `${x.etiqueta.razonSocial} · ${x.etiqueta.comuna}` : x.localId} valor={`${x.cerrados} de ${x.intentos} visitas`} ayuda={`Cerrado a las ${textoDeHoras(x.horasCerrado)}. Sirve para cargar su horario de atención.`} />
                  ))}
                </ul>
              </>
            ) : null}

            {p.ultimaEjecucion && p.ultimaEjecucion.resumen.pinesProponidos > 0 ? <Aviso>El sistema propuso mover {p.ultimaEjecucion.resumen.pinesProponidos} pines que las visitas contradicen: están en «Pines de locales» para que los revises.</Aviso> : null}
          </>
        );
      })() : null}
    </Pagina>
  );
};
