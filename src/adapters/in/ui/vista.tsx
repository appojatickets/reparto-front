import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Vista } from '../../../application/ports/vista-store';
import { useCasos } from './contexto';
import { Boton } from './componentes/ui';

type Contexto = { readonly vista: Vista; readonly cambiar: (v: Vista) => void };
const VistaContexto = createContext<Contexto | undefined>(undefined);

/** Aplica la vista elegida a toda la app (atributo en <html>) y la pregunta la primera vez que se entra. */
export const ProveedorVista = ({ children }: { readonly children: ReactNode }) => {
  const { vista: store } = useCasos();
  const [vista, setVista] = useState<Vista | undefined>(() => store.cargar());

  useEffect(() => {
    if (vista) document.documentElement.dataset['vista'] = vista;
  }, [vista]);

  if (!vista) {
    const elegir = (v: Vista): void => {
      store.guardar(v);
      setVista(v);
    };
    return (
      <main className="screen" aria-label="Elegir vista">
        <h1>¿Cómo quieres ver la app?</h1>
        <p>Puedes cambiarlo cuando quieras con el botón VISTA.</p>
        <Boton onClick={() => { elegir('grande'); }}>GRANDE</Boton>
        <p className="ayuda">Letra y botones grandes, más fácil de leer.</p>
        <Boton variante="secundario" onClick={() => { elegir('normal'); }}>NORMAL</Boton>
        <p className="ayuda">Letra y botones normales: caben más datos en la pantalla.</p>
      </main>
    );
  }
  const cambiar = (v: Vista): void => {
    store.guardar(v);
    setVista(v);
  };
  return <VistaContexto.Provider value={{ vista, cambiar }}>{children}</VistaContexto.Provider>;
};

export const useVista = (): Contexto => {
  const c = useContext(VistaContexto);
  if (!c) throw new Error('Falta ProveedorVista');
  return c;
};

/** Botón para pasar de una vista a la otra (siempre a mano en la cabecera). */
export const CambiarVista = () => {
  const { vista, cambiar } = useVista();
  const otra: Vista = vista === 'grande' ? 'normal' : 'grande';
  return (
    <Boton variante="secundario" aria-label={`VISTA: ahora ${vista}. Cambiar a ${otra}`} onClick={() => { cambiar(otra); }}>
      {vista === 'grande' ? 'VISTA NORMAL' : 'VISTA GRANDE'}
    </Boton>
  );
};
