import { useCallback, useState, type SyntheticEvent } from 'react';
import { leerCoordenadas, textoCoordenadas } from '../../../../domain/coordenadas';
import { horaDeMinutos, minutosDeHora } from '../../../../domain/hora';
import { mensajeDeError } from '../../../../application/mensajes';
import type { ConfigEmpresa } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { Aviso, Boton, Campo, Cargando, ErrorCarga, Pagina } from '../componentes/ui';

const Formulario = ({ config }: { readonly config: ConfigEmpresa }) => {
  const { api } = useCasos();
  const [coordenadas, setCoordenadas] = useState(config.deposito ? textoCoordenadas(config.deposito) : '');
  const [nombre, setNombre] = useState(config.deposito?.nombre ?? '');
  const [salida, setSalida] = useState(horaDeMinutos(config.salidaPorDefectoMin));
  const [limite, setLimite] = useState(horaDeMinutos(config.horaLimiteRegresoMin));
  const [error, setError] = useState<string | undefined>();
  const [guardado, setGuardado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    setError(undefined);
    setGuardado(false);
    const punto = coordenadas.trim() === '' ? undefined : leerCoordenadas(coordenadas);
    if (coordenadas.trim() !== '' && !punto) {
      setError('No entendí las coordenadas. Pega las dos cifras como las copia Google Maps, por ejemplo: -33.4372, -70.6506 (deben estar en la Región Metropolitana).');
      return;
    }
    const s = minutosDeHora(salida);
    const l = minutosDeHora(limite);
    if (s === undefined || l === undefined) {
      setError('Revisa las horas.');
      return;
    }
    setOcupado(true);
    const r = await api.guardarConfig({
      ...(punto ? { deposito: { ...punto, ...(nombre.trim() !== '' ? { nombre: nombre.trim() } : {}) } } : {}),
      salidaPorDefectoMin: s,
      horaLimiteRegresoMin: l,
    });
    setOcupado(false);
    if (r.ok) setGuardado(true);
    else setError(mensajeDeError(r.error));
  };

  return (
    <form className="pagina" onSubmit={(e) => void enviar(e)} noValidate>
      {!config.deposito ? <Aviso tipo="error">Falta el depósito: sin él no se pueden calcular las rutas.</Aviso> : null}
      <Campo
        etiqueta="Ubicación del depósito"
        ayuda="En Google Maps toca y mantén el punto, y copia las dos cifras de arriba. Pégalas aquí."
        value={coordenadas}
        onChange={(e) => { setCoordenadas(e.target.value); }}
        autoComplete="off"
      />
      <Campo etiqueta="Nombre del depósito (opcional)" value={nombre} onChange={(e) => { setNombre(e.target.value); }} autoComplete="off" />
      <Campo etiqueta="Hora de salida habitual" type="time" value={salida} onChange={(e) => { setSalida(e.target.value); }} />
      <Campo etiqueta="Avisar si el regreso pasa de las" ayuda="Si una ruta termina después de esta hora, se marca en rojo." type="time" value={limite} onChange={(e) => { setLimite(e.target.value); }} />
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      <Boton type="submit" disabled={ocupado}>{ocupado ? 'GUARDANDO…' : 'GUARDAR'}</Boton>
      {guardado ? <Aviso tipo="exito">Configuración guardada.</Aviso> : null}
    </form>
  );
};

export const PaginaConfiguracion = () => {
  const { api } = useCasos();
  const cargar = useCallback(() => api.obtenerConfig(), [api]);
  const { estado, recargar } = useCarga(cargar);
  return (
    <Pagina titulo="Configuración del reparto">
      {estado.tipo === 'cargando' ? <Cargando /> : null}
      {estado.tipo === 'error' ? <ErrorCarga error={estado.error} alReintentar={recargar} /> : null}
      {estado.tipo === 'ok' ? <Formulario config={estado.datos} /> : null}
    </Pagina>
  );
};
