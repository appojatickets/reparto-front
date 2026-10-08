import { useCallback, useState } from 'react';
import { enlaceNavegar, enlaceWhatsApp, mensajeDireccionNoEncontrada, mensajeLocalCerrado } from '../../../../domain/enlaces';
import { minutosEnChile } from '../../../../domain/fechas';
import { horaDelDia } from '../../../../domain/hora';
import { mensajeDeError } from '../../../../application/mensajes';
import type { EventoEntrega, ParadaDeRuta, ResultadoEvento } from '../../../../application/modelos';
import type { Result } from '../../../../domain/result';
import type { ApiError } from '../../../../application/ports/api-client';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { Aviso, Boton, Campo } from './ui';
import { PegarUbicacion } from './PegarUbicacion';

type Panel = 'cerrado' | 'direccion' | 'ubicacion' | undefined;

/** Un botón de WhatsApp por cada vendedor con celular (ADR 0017); sin vendedores cargados, uno solo para elegir el contacto. */
const AvisoAlVendedor = ({ mensaje }: { readonly mensaje: (nombre: string) => string }) => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.listarVendedores(), [api]);
  const { estado } = useCarga(cargar);
  const [nombre, setNombre] = useState('');
  const texto = mensaje(nombre);
  const conCelular = estado.tipo === 'ok' ? estado.datos.filter((v) => v.celular !== undefined) : [];
  const campo = (
    <Campo
      etiqueta="Nombre que sale en la guía"
      ayuda="Escríbelo o dictalo como está en la guía: así el vendedor sabe de qué cliente hablas. Si lo dejas vacío, el mensaje lleva solo la dirección."
      value={nombre}
      onChange={(e) => { setNombre(e.target.value); }}
      autoComplete="off"
    />
  );
  if (conCelular.length === 0) {
    return (
      <>
        {campo}
        <a className="big-button big-button--primario" href={enlaceWhatsApp(texto)} target="_blank" rel="noreferrer">AVISAR AL VENDEDOR POR WHATSAPP</a>
      </>
    );
  }
  return (
    <>
      {campo}
      {conCelular.map((v) => (
        <a key={v.id} className="big-button big-button--primario" href={enlaceWhatsApp(texto, v.celular)} target="_blank" rel="noreferrer">{`AVISAR A ${v.codigo} ${v.nombre.toUpperCase()} POR WHATSAPP`}</a>
      ))}
      <a className="big-button big-button--secundario" href={enlaceWhatsApp(texto)} target="_blank" rel="noreferrer">AVISAR A OTRO CONTACTO</a>
    </>
  );
};

/**
 * Lo que el chofer hace en cada parada: navegar (Waze / Google Maps), avisar que llegó (y así fijar el pin del local si no lo
 * tenía), entregar, y si el local está cerrado o no encuentra la dirección, avisar al vendedor por WhatsApp (ADR 0014 y 0016).
 */
type AvisoParada = { tipo: 'error' | 'exito' | 'info'; texto: string };

/** Lo que se le avisa al servidor de una parada (llegué, entregué, está cerrado…), con la posición del GPS si se puede leer. */
const useEventosDeParada = (p: ParadaDeRuta) => {
  const { api, ubicacion } = useCasos();
  const [aviso, setAviso] = useState<AvisoParada | undefined>();
  const [ocupado, setOcupado] = useState(false);

  /** Manda el aviso con la posición del GPS si se pudo leer; si no, se anota igual (el GPS no debe frenar la entrega). */
  const avisar = async (evento: EventoEntrega, conPosicion = true): Promise<{ r: Result<ResultadoEvento, ApiError>; sinGps: boolean }> => {
    setOcupado(true);
    setAviso(undefined);
    let posicion: { lat: number; lng: number; precisionM: number } | undefined;
    let sinGps = false;
    if (conPosicion && ubicacion.disponible) {
      const u = await ubicacion.actual();
      if (u.ok) posicion = u.value;
      else sinGps = true;
    }
    const r = await api.registrarEvento(p.facturaId, { ...evento, ...(posicion ? { lat: posicion.lat, lng: posicion.lng, precisionM: posicion.precisionM } : {}) });
    setOcupado(false);
    if (!r.ok) setAviso({ tipo: 'error', texto: mensajeDeError(r.error) });
    return { r, sinGps };
  };

  /** Lo que se hace con un local cerrado cuando ya se avisó al vendedor: esperar, seguir y volver más tarde, o dejarlo para otro día. */
  const esperar = async (minutos: number): Promise<void> => {
    const { r } = await avisar({ tipo: 'espera', minutos }, false);
    if (r.ok) setAviso({ tipo: 'exito', texto: `Esperando ${minutos} minutos. Cuando termine, toca ENTREGADO o decide qué hacer.` });
  };
  const volverMasTarde = async (alPosponer: () => void, alTerminar: () => void): Promise<void> => {
    const { r } = await avisar({ tipo: 'vuelve_mas_tarde' }, false);
    if (r.ok) {
      alTerminar();
      alPosponer();
    }
  };
  const noEntregado = async (motivo: 'cerrado' | 'direccion', alCambiar: () => void): Promise<void> => {
    const { r } = await avisar({ tipo: 'no_entregado', motivo });
    if (r.ok) alCambiar();
  };
  return { aviso, setAviso, ocupado, avisar, esperar, volverMasTarde, noEntregado };
};

/** Atajo de la fila de la ruta: ENTREGADO marca la entrega como hecha con un toque (queda en «Hechas hoy» y se puede deshacer). */
export const AtajoEntregado = ({ p, alCambiar }: { readonly p: ParadaDeRuta; readonly alCambiar: () => void }) => {
  const { aviso, ocupado, avisar } = useEventosDeParada(p);
  const entregar = async (): Promise<void> => {
    const { r } = await avisar({ tipo: 'entregado' });
    if (r.ok) alCambiar();
  };
  return (
    <>
      <Boton variante="secundario" className="atajo" disabled={ocupado} aria-label={`MARCAR ENTREGADA ${p.cliente}`} onClick={() => void entregar()}>ENTREGADO</Boton>
      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}
    </>
  );
};

/**
 * Atajo de la fila de la ruta: CERRADO anota que el local está cerrado (con la posición del GPS) y despliega la lista habitual: avisar al
 * vendedor por WhatsApp, esperar 10 minutos o seguir y volver más tarde. «Más opciones» suma esperar 15 o 20 minutos y dejarla para otro día.
 * Tocarlo de nuevo cierra la lista sin anotar otro aviso.
 */
export const AtajoCerrado = ({ p, alCambiar, alPosponer }: { readonly p: ParadaDeRuta; readonly alCambiar: () => void; readonly alPosponer: () => void }) => {
  const { ahora } = useCasos();
  const { aviso, setAviso, ocupado, avisar, esperar, volverMasTarde, noEntregado } = useEventosDeParada(p);
  const [abierto, setAbierto] = useState(false);
  const [mas, setMas] = useState(false);
  const destino = { direccion: p.direccion, comuna: p.comuna, lat: p.lat, lng: p.lng };

  const tocar = async (): Promise<void> => {
    if (abierto) {
      setAbierto(false);
      return;
    }
    const { r, sinGps } = await avisar({ tipo: 'cerrado' });
    if (!r.ok) return;
    setMas(false);
    setAbierto(true);
    if (sinGps) setAviso({ tipo: 'info', texto: 'No pude leer el GPS; quedó sin ubicación.' });
  };

  return (
    <>
      <Boton variante="secundario" className="atajo" disabled={ocupado} aria-expanded={abierto} aria-label={`CERRADO ${p.cliente}`} onClick={() => void tocar()}>CERRADO</Boton>
      {abierto ? (
        <div className="tarjeta parada-panel" aria-label={`Opciones de local cerrado: ${p.cliente}`}>
          <strong>Local cerrado. ¿Qué hacemos?</strong>
          <AvisoAlVendedor mensaje={(nombre) => mensajeLocalCerrado({ ...destino, nombre }, horaDelDia(minutosEnChile(ahora())))} />
          <div className="fila-botones">
            <Boton variante="secundario" disabled={ocupado} onClick={() => void esperar(10)}>ESPERAR 10 MIN</Boton>
            <Boton variante="secundario" disabled={ocupado} onClick={() => void volverMasTarde(alPosponer, () => { setAbierto(false); })}>VOLVER MÁS TARDE</Boton>
          </div>
          <Boton variante="secundario" aria-expanded={mas} aria-label={`MÁS OPCIONES DE CERRADO ${p.cliente}`} onClick={() => { setMas(!mas); }}>MÁS OPCIONES</Boton>
          {mas ? (
            <div className="fila-botones">
              {[15, 20].map((m) => <Boton key={m} variante="secundario" disabled={ocupado} onClick={() => void esperar(m)}>{`ESPERAR ${m} MIN`}</Boton>)}
              <Boton variante="peligro" disabled={ocupado} onClick={() => void noEntregado('cerrado', alCambiar)}>DEJAR PARA OTRO DÍA</Boton>
            </div>
          ) : null}
        </div>
      ) : null}
      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}
    </>
  );
};

/** Atajo de la fila de la ruta: IR abre Google Maps con el destino (Waze sigue en el detalle de la parada). */
export const AtajoIr = ({ p }: { readonly p: ParadaDeRuta }) => (
  <a className="big-button big-button--primario atajo" href={enlaceNavegar({ direccion: p.direccion, comuna: p.comuna, lat: p.lat, lng: p.lng }, 'google')} target="_blank" rel="noreferrer" aria-label={`IR A ${p.cliente} CON GOOGLE MAPS`}>IR</a>
);

export const AccionesParada = ({ p, alCambiar, alPosponer }: { readonly p: ParadaDeRuta; readonly alCambiar: () => void; readonly alPosponer: () => void }) => {
  const { ahora } = useCasos();
  const [panel, setPanel] = useState<Panel>(undefined);
  const { aviso, setAviso, ocupado, avisar, esperar, volverMasTarde, noEntregado } = useEventosDeParada(p);
  const destino = { direccion: p.direccion, comuna: p.comuna, lat: p.lat, lng: p.lng };
  const horaAhora = (): string => horaDelDia(minutosEnChile(ahora()));

  const nota = (sinGps: boolean): string => (sinGps ? ' No pude leer el GPS; quedó sin ubicación.' : '');

  const entregado = async (): Promise<void> => {
    const { r } = await avisar({ tipo: 'entregado' });
    if (r.ok) alCambiar();
  };
  const cerrado = async (): Promise<void> => {
    const { r, sinGps } = await avisar({ tipo: 'cerrado' });
    if (r.ok) {
      setPanel('cerrado');
      if (sinGps) setAviso({ tipo: 'info', texto: nota(true).trim() });
    }
  };
  return (
    <div className="pagina" aria-label={`Acciones de ${p.cliente}`}>
      <div className="fila-botones">
        <a className="big-button big-button--primario" href={enlaceNavegar(destino, 'waze')} target="_blank" rel="noreferrer" aria-label={`NAVEGAR CON WAZE a ${p.cliente}`}>WAZE</a>
        <a className="big-button big-button--primario" href={enlaceNavegar(destino, 'google')} target="_blank" rel="noreferrer" aria-label={`NAVEGAR CON GOOGLE MAPS a ${p.cliente}`}>GOOGLE MAPS</a>
      </div>
      <div className="fila-botones">
        <Boton disabled={ocupado} aria-label={`ENTREGADO ${p.cliente}`} onClick={() => void entregado()}>ENTREGADO</Boton>
        <Boton variante="secundario" aria-expanded={panel === 'ubicacion'} aria-label={`UBICACIÓN DEL VENDEDOR ${p.cliente}`} onClick={() => { setPanel(panel === 'ubicacion' ? undefined : 'ubicacion'); }}>UBICACIÓN DEL VENDEDOR</Boton>
      </div>
      <div className="fila-botones">
        <Boton variante="secundario" disabled={ocupado} aria-label={`ESTÁ CERRADO ${p.cliente}`} onClick={() => void cerrado()}>ESTÁ CERRADO</Boton>
        <Boton variante="secundario" disabled={ocupado} aria-label={`NO LA ENCUENTRO ${p.cliente}`} onClick={() => { setPanel(panel === 'direccion' ? undefined : 'direccion'); }}>NO LA ENCUENTRO</Boton>
      </div>

      {panel === 'cerrado' ? (
        <div className="tarjeta" aria-label={`Local cerrado: ${p.cliente}`}>
          <strong>Local cerrado. ¿Qué hacemos?</strong>
          <AvisoAlVendedor mensaje={(nombre) => mensajeLocalCerrado({ ...destino, nombre }, horaAhora())} />
          <span>Cuando el vendedor te responda:</span>
          <div className="fila-botones">
            {[10, 15, 20].map((m) => <Boton key={m} variante="secundario" disabled={ocupado} onClick={() => void esperar(m)}>{`ESPERAR ${m} MIN`}</Boton>)}
          </div>
          <Boton variante="secundario" disabled={ocupado} onClick={() => void volverMasTarde(alPosponer, () => { setPanel(undefined); })}>SEGUIR Y VOLVER MÁS TARDE</Boton>
          <Boton variante="peligro" disabled={ocupado} onClick={() => void noEntregado('cerrado', alCambiar)}>SEGUIR: DEJAR PARA OTRO DÍA</Boton>
        </div>
      ) : null}

      {panel === 'ubicacion' ? (
        <div className="tarjeta" aria-label={`Ubicación del vendedor: ${p.cliente}`}>
          <PegarUbicacion localId={p.localId} />
        </div>
      ) : null}

      {panel === 'direccion' ? (
        <div className="tarjeta" aria-label={`No encuentra la dirección: ${p.cliente}`}>
          <strong>¿No encuentras la dirección?</strong>
          <a className="big-button big-button--primario" href={enlaceWhatsApp(mensajeDireccionNoEncontrada({ ...destino, nombre: p.cliente }))} target="_blank" rel="noreferrer">ENVIAR LA DIRECCIÓN POR WHATSAPP</a>
          <Boton variante="peligro" disabled={ocupado} onClick={() => void noEntregado('direccion', alCambiar)}>NO SE PUDO ENTREGAR (DIRECCIÓN)</Boton>
        </div>
      ) : null}

      {aviso ? <Aviso tipo={aviso.tipo === 'info' ? 'info' : aviso.tipo}>{aviso.texto}</Aviso> : null}
    </div>
  );
};
