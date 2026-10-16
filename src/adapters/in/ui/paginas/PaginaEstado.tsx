import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { haceCuanto, hayDatosSuficientes, versionVisible } from '../../../../domain/estado';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { Aviso, Cargando, ErrorCarga, Pagina } from '../componentes/ui';

const Dato = ({ titulo, valor, ayuda }: { readonly titulo: string; readonly valor: string; readonly ayuda?: string }) => (
  <li className="tarjeta">
    <span>{titulo}</span>
    <strong>{valor}</strong>
    {ayuda ? <span className="ayuda">{ayuda}</span> : null}
  </li>
);

/**
 * Estado del sistema (solo admin, ADR 0051 del back): si el teléfono y el servidor tienen lo último publicado, cuándo corrió el análisis,
 * cuántos datos hay y cuántos locales ya tienen lo aprendido, para saber cuándo conviene mirar la analítica.
 */
export const PaginaEstado = () => {
  const { api, ahora } = useCasos();
  const cargar = useCallback(() => api.analitica(), [api]);
  const { estado, recargar } = useCarga(cargar);
  const [servidor, setServidor] = useState<{ version?: string; ok: boolean } | undefined>();
  const [usaAprendido, setUsaAprendido] = useState<boolean | undefined>();

  useEffect(() => {
    const control = new AbortController();
    void api.getHealth(control.signal).then((r) => { if (!control.signal.aborted) setServidor(r.ok ? { ok: r.value.status === 'ok', ...(r.value.version !== undefined ? { version: r.value.version } : {}) } : { ok: false }); });
    void api.obtenerConfig().then((r) => { if (!control.signal.aborted && r.ok) setUsaAprendido(r.value.usarCierresAprendidos !== false); });
    return () => { control.abort(); };
  }, [api]);

  return (
    <Pagina titulo="Estado del sistema">
      <p>Para saber de un vistazo si todo está al día y cuándo hay datos suficientes para sacar conclusiones.</p>
      <section className="pagina" aria-label="Versiones">
        <h2>Versiones publicadas</h2>
        <ul className="tarjetas">
          <Dato titulo="Esta app (el teléfono)" valor={__VERSION__} ayuda="Es el commit que Vercel publicó. Si no es el último, cierra la app y ábrela de nuevo." />
          <Dato titulo="Servidor" valor={servidor === undefined ? 'consultando…' : servidor.ok ? `${versionVisible(servidor.version)} · funcionando` : 'no responde bien'} />
        </ul>
      </section>

      {estado.tipo === 'cargando' ? <Cargando /> : null}
      {estado.tipo === 'error' ? <ErrorCarga error={estado.error} alReintentar={recargar} /> : null}
      {estado.tipo === 'ok' ? (() => {
        const p = estado.datos;
        const c = p.cobertura;
        const ultima = p.ultimaEjecucion ? new Date(p.ultimaEjecucion.terminadoEn) : undefined;
        const suficientes = hayDatosSuficientes(c);
        return (
          <>
            <section className="pagina" aria-label="Datos acumulados">
              <h2>Datos acumulados (últimos 30 días)</h2>
              <Aviso tipo={suficientes ? 'exito' : 'info'}>{suficientes ? 'Ya hay datos para mirar la analítica con algo de confianza.' : 'Todavía son pocos datos: sigue repartiendo. Se necesitan unas 10 jornadas terminadas y 150 avisos para sacar conclusiones.'}</Aviso>
              <ul className="tarjetas">
                <Dato titulo="Jornadas" valor={`${c.jornadasTerminadas} terminadas de ${c.jornadas}`} />
                <Dato titulo="Avisos de parada" valor={`${c.avisos}`} ayuda={`${c.avisosConGps} con GPS · ${c.avisosAutomaticos} automáticos`} />
                <Dato titulo="Puntos de GPS del camión" valor={`${c.puntosGps}`} ayuda={c.ultimoPuntoGps ? `El último, ${haceCuanto(new Date(c.ultimoPuntoGps), ahora())}.` : 'Todavía ninguno.'} />
                <Dato titulo="Pines" valor={`${p.pines.verificados} verificados · ${p.pines.porVerificar} por verificar · ${p.pines.sinPin} sin pin`} />
              </ul>
            </section>

            {p.coberturaGps && p.coberturaGps.length > 0 ? (
              <section className="pagina" aria-label="GPS del recorrido">
                <h2>GPS del recorrido</h2>
                <p>Minutos con GPS entre la primera y la última entrega de cada día. Mientras más alto, mejor aprende la ruta (llegadas, tiempos, cierres).</p>
                <ul className="tarjetas">
                  {p.coberturaGps.map((g) => (
                    <Dato key={`${g.fecha}-${g.camionId}`} titulo={`${g.fecha} · camión ${g.camion ?? ''}`} valor={`${Math.round((g.minutosConGps / Math.max(1, g.minutosEnRuta)) * 100)} %`} ayuda={`${g.minutosConGps} de ${g.minutosEnRuta} minutos.`} />
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="pagina" aria-label="Lo aprendido">
              <h2>Lo aprendido</h2>
              <ul className="tarjetas">
                <Dato titulo="Último análisis" valor={ultima ? haceCuanto(ultima, ahora()) : 'todavía no corrió'} ayuda="Corre solo cada 3 horas y poco después de terminar una ruta. En ANALÍTICA puedes correrlo ahora." />
                {p.fichas ? (
                  <>
                    <Dato titulo="Locales con hora habitual de entrega" valor={`${p.fichas.conHoraHabitual} de ${p.fichas.locales}`} ayuda="Con 3 o más entregas." />
                    <Dato titulo="Locales con cierre probable que la ruta ya usa" valor={`${p.fichas.conCierreProbable} de ${p.fichas.locales}`} ayuda="Con 3 o más visitas en una franja y probabilidad de cerrado alta." />
                  </>
                ) : null}
                <Dato titulo="La ruta usa lo aprendido sobre cierres" valor={usaAprendido === undefined ? 'consultando…' : usaAprendido ? 'Sí' : 'No (apagado)'} ayuda="Se cambia en CONFIGURACIÓN." />
              </ul>
              <div className="fila-botones">
                <Link className="big-button big-button--secundario" to="/admin/analitica">VER ANALÍTICA</Link>
                <Link className="big-button big-button--secundario" to="/admin/configuracion">IR A CONFIGURACIÓN</Link>
              </div>
            </section>
          </>
        );
      })() : null}
    </Pagina>
  );
};
