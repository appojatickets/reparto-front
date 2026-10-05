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
import { Aviso, Boton } from './ui';

type Panel = 'cerrado' | 'direccion' | undefined;

/** Un botón de WhatsApp por cada vendedor con celular (ADR 0017); sin vendedores cargados, uno solo para elegir el contacto. */
const AvisoAlVendedor = ({ mensaje }: { readonly mensaje: string }) => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.listarVendedores(), [api]);
  const { estado } = useCarga(cargar);
  const conCelular = estado.tipo === 'ok' ? estado.datos.filter((v) => v.celular !== undefined) : [];
  if (conCelular.length === 0) {
    return <a className="big-button big-button--primario" href={enlaceWhatsApp(mensaje)} target="_blank" rel="noreferrer">AVISAR AL VENDEDOR POR WHATSAPP</a>;
  }
  return (
    <>
      {conCelular.map((v) => (
        <a key={v.id} className="big-button big-button--primario" href={enlaceWhatsApp(mensaje, v.celular)} target="_blank" rel="noreferrer">{`AVISAR A ${v.codigo} ${v.nombre.toUpperCase()} POR WHATSAPP`}</a>
      ))}
      <a className="big-button big-button--secundario" href={enlaceWhatsApp(mensaje)} target="_blank" rel="noreferrer">AVISAR A OTRO CONTACTO</a>
    </>
  );
};

/**
 * Lo que el chofer hace en cada parada: navegar (Waze / Google Maps), avisar que llegó (y así fijar el pin del local si no lo
 * tenía), entregar, y si el local está cerrado o no encuentra la dirección, avisar al vendedor por WhatsApp (ADR 0014 y 0016).
 */
export const AccionesParada = ({ p, alCambiar, alPosponer }: { readonly p: ParadaDeRuta; readonly alCambiar: () => void; readonly alPosponer: () => void }) => {
  const { api, ubicacion, ahora } = useCasos();
  const [panel, setPanel] = useState<Panel>(undefined);
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'exito' | 'info'; texto: string } | undefined>();
  const [ocupado, setOcupado] = useState(false);
  const destino = { direccion: p.direccion, comuna: p.comuna, lat: p.lat, lng: p.lng };
  const horaAhora = (): string => horaDelDia(minutosEnChile(ahora()));

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

  const nota = (sinGps: boolean): string => (sinGps ? ' No pude leer el GPS; quedó sin ubicación.' : '');

  const llegue = async (): Promise<void> => {
    const { r, sinGps } = await avisar({ tipo: 'llegada' });
    if (r.ok) setAviso({ tipo: 'exito', texto: `${r.value.pinFijado ? 'Llegada anotada. Fijé la ubicación de este local con tu posición.' : 'Llegada anotada.'}${nota(sinGps)}` });
  };
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
  const esperar = async (minutos: number): Promise<void> => {
    const { r } = await avisar({ tipo: 'espera', minutos }, false);
    if (r.ok) setAviso({ tipo: 'exito', texto: `Esperando ${minutos} minutos (hasta las ${horaDelDia(minutosEnChile(ahora()) + minutos)}). Cuando termine, toca ENTREGADO o decide qué hacer.` });
  };
  const volverMasTarde = async (): Promise<void> => {
    const { r } = await avisar({ tipo: 'vuelve_mas_tarde' }, false);
    if (r.ok) {
      setPanel(undefined);
      alPosponer();
    }
  };
  const noEntregado = async (motivo: 'cerrado' | 'direccion'): Promise<void> => {
    const { r } = await avisar({ tipo: 'no_entregado', motivo });
    if (r.ok) alCambiar();
  };

  return (
    <div className="pagina" aria-label={`Acciones de ${p.cliente}`}>
      <div className="fila-botones">
        <a className="big-button big-button--primario" href={enlaceNavegar(destino, 'waze')} target="_blank" rel="noreferrer" aria-label={`NAVEGAR CON WAZE a ${p.cliente}`}>WAZE</a>
        <a className="big-button big-button--primario" href={enlaceNavegar(destino, 'google')} target="_blank" rel="noreferrer" aria-label={`NAVEGAR CON GOOGLE MAPS a ${p.cliente}`}>GOOGLE MAPS</a>
      </div>
      <div className="fila-botones">
        <Boton disabled={ocupado} aria-label={`ESTOY AQUÍ ${p.cliente}`} onClick={() => void llegue()}>ESTOY AQUÍ</Boton>
        <Boton disabled={ocupado} aria-label={`ENTREGADO ${p.cliente}`} onClick={() => void entregado()}>ENTREGADO</Boton>
      </div>
      <div className="fila-botones">
        <Boton variante="secundario" disabled={ocupado} aria-label={`ESTÁ CERRADO ${p.cliente}`} onClick={() => void cerrado()}>ESTÁ CERRADO</Boton>
        <Boton variante="secundario" disabled={ocupado} aria-label={`NO LA ENCUENTRO ${p.cliente}`} onClick={() => { setPanel(panel === 'direccion' ? undefined : 'direccion'); }}>NO LA ENCUENTRO</Boton>
      </div>

      {panel === 'cerrado' ? (
        <div className="tarjeta" aria-label={`Local cerrado: ${p.cliente}`}>
          <strong>Local cerrado. ¿Qué hacemos?</strong>
          <AvisoAlVendedor mensaje={mensajeLocalCerrado({ ...destino, cliente: p.cliente }, horaAhora())} />
          <span>Cuando el vendedor te responda:</span>
          <div className="fila-botones">
            {[10, 15, 20].map((m) => <Boton key={m} variante="secundario" disabled={ocupado} onClick={() => void esperar(m)}>{`ESPERAR ${m} MIN`}</Boton>)}
          </div>
          <Boton variante="secundario" disabled={ocupado} onClick={() => void volverMasTarde()}>SEGUIR Y VOLVER MÁS TARDE</Boton>
          <Boton variante="peligro" disabled={ocupado} onClick={() => void noEntregado('cerrado')}>SEGUIR: DEJAR PARA OTRO DÍA</Boton>
        </div>
      ) : null}

      {panel === 'direccion' ? (
        <div className="tarjeta" aria-label={`No encuentra la dirección: ${p.cliente}`}>
          <strong>¿No encuentras la dirección?</strong>
          <a className="big-button big-button--primario" href={enlaceWhatsApp(mensajeDireccionNoEncontrada({ ...destino, cliente: p.cliente }))} target="_blank" rel="noreferrer">ENVIAR LA DIRECCIÓN POR WHATSAPP</a>
          <Boton variante="peligro" disabled={ocupado} onClick={() => void noEntregado('direccion')}>NO SE PUDO ENTREGAR (DIRECCIÓN)</Boton>
        </div>
      ) : null}

      {aviso ? <Aviso tipo={aviso.tipo === 'info' ? 'info' : aviso.tipo}>{aviso.texto}</Aviso> : null}
    </div>
  );
};
