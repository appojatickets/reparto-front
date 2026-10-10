import { useCallback, useState, type SyntheticEvent } from 'react';
import { leerCoordenadas, textoCoordenadas } from '../../../../domain/coordenadas';
import { mensajeDeError } from '../../../../application/mensajes';
import type { ConfigEmpresa, OrdenInicio } from '../../../../application/modelos';
import { useCasos } from '../contexto';
import { useCarga } from '../hooks';
import { Aviso, Boton, Campo, Cargando, ErrorCarga, Pagina, Selector } from '../componentes/ui';

const Formulario = ({ config }: { readonly config: ConfigEmpresa }) => {
  const { api } = useCasos();
  const [coordenadas, setCoordenadas] = useState(config.deposito ? textoCoordenadas(config.deposito) : '');
  const [nombre, setNombre] = useState(config.deposito?.nombre ?? '');
  const [ordenInicio, setOrdenInicio] = useState<OrdenInicio>(config.ordenInicio ?? 'automatico');
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
    setOcupado(true);
    const r = await api.guardarConfig({
      ...(punto ? { deposito: { ...punto, ...(nombre.trim() !== '' ? { nombre: nombre.trim() } : {}) } } : {}),
      // Las horas ya no se muestran ni se editan (las estimaciones no eran confiables): se conservan tal como estaban.
      salidaPorDefectoMin: config.salidaPorDefectoMin,
      horaLimiteRegresoMin: config.horaLimiteRegresoMin,
      ordenInicio,
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
      <Selector etiqueta="Por dónde parte la ruta" value={ordenInicio} onChange={(e) => { setOrdenInicio(e.target.value as OrdenInicio); }}>
        <option value="automatico">Lo decide el sistema</option>
        <option value="lejano">Por lo más lejano del depósito</option>
        <option value="cercano">Por lo más cercano al depósito</option>
      </Selector>
      <p className="ayuda">Es una preferencia: un local que cierra temprano se atiende antes aunque quede cerca.</p>
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
