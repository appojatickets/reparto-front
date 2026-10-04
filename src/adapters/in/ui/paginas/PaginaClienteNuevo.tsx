import { useState, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router';
import { COMUNAS_RM } from '../../../../domain/comunas';
import type { FilaCliente } from '../../../../application/modelos';
import { mensajeDeError, mensajesDeDetalle } from '../../../../application/mensajes';
import { useCasos } from '../contexto';
import { AreaTexto, Aviso, Boton, Campo, Pagina, Selector } from '../componentes/ui';

const sinVacios = (f: Record<string, string>): FilaCliente =>
  Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim() !== ''));

export const PaginaClienteNuevo = () => {
  const { api } = useCasos();
  const navegar = useNavigate();
  const [f, setF] = useState({ razonSocial: '', rut: '', giro: '', direccion: '', comuna: '', lat: '', lng: '', nota: '' });
  const [errores, setErrores] = useState<readonly string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const cambiar = (campo: keyof typeof f) => (e: { target: { value: string } }): void => { setF((a) => ({ ...a, [campo]: e.target.value })); };

  const enviar = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    setEnviando(true);
    setErrores([]);
    const r = await api.crearCliente(sinVacios(f));
    setEnviando(false);
    if (r.ok) void navegar(`/clientes/${r.value.localId}`);
    else {
      const detalle = mensajesDeDetalle(r.error);
      setErrores(detalle.length > 0 ? detalle : [mensajeDeError(r.error)]);
    }
  };

  return (
    <Pagina titulo="Cliente nuevo">
      <form className="pagina" onSubmit={(e) => void enviar(e)} noValidate>
        <Campo etiqueta="Razón social o nombre" value={f.razonSocial} onChange={cambiar('razonSocial')} autoFocus />
        <Campo etiqueta="RUT (opcional)" ayuda="Se valida el dígito verificador." value={f.rut} onChange={cambiar('rut')} inputMode="text" autoCapitalize="characters" />
        <Campo etiqueta="Giro (opcional)" value={f.giro} onChange={cambiar('giro')} />
        <Campo etiqueta="Dirección" value={f.direccion} onChange={cambiar('direccion')} />
        <Selector etiqueta="Comuna" value={f.comuna} onChange={cambiar('comuna')}>
          <option value="">Elige la comuna</option>
          {COMUNAS_RM.map((c) => <option key={c} value={c}>{c}</option>)}
        </Selector>
        <Campo etiqueta="Latitud del pin (opcional)" ayuda="Ejemplo: -33,4372. Con el mapa será más fácil." value={f.lat} onChange={cambiar('lat')} inputMode="decimal" />
        <Campo etiqueta="Longitud del pin (opcional)" ayuda="Ejemplo: -70,6506" value={f.lng} onChange={cambiar('lng')} inputMode="decimal" />
        <AreaTexto etiqueta="Nota (opcional)" ayuda="Por ejemplo: portón verde." value={f.nota} onChange={cambiar('nota')} maxLength={500} />
        {errores.length > 0 ? <Aviso tipo="error">{errores.join(' ')}</Aviso> : null}
        <Boton type="submit" disabled={enviando}>{enviando ? 'GUARDANDO…' : 'GUARDAR CLIENTE'}</Boton>
      </form>
    </Pagina>
  );
};
