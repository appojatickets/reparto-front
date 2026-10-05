import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Tema } from '../../../application/ports/tema-store';
import { useCasos } from './contexto';
import { Boton } from './componentes/ui';

type Contexto = { readonly tema: Tema; readonly cambiar: (t: Tema) => void };
const TemaContexto = createContext<Contexto | undefined>(undefined);

const delSistema = (): Tema => (typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro');
const FONDO: Readonly<Record<Tema, string>> = { claro: '#ffffff', oscuro: '#000000', suave: '#f1e9d6' };
/** El botón recorre los tres modos en este orden. */
const SIGUIENTE: Readonly<Record<Tema, Tema>> = { claro: 'oscuro', oscuro: 'suave', suave: 'claro' };
const ETIQUETA: Readonly<Record<Tema, string>> = { claro: 'MODO CLARO', oscuro: 'MODO OSCURO', suave: 'MODO SUAVE' };

/** Aplica el tema (atributo en <html>): el elegido en este teléfono o, si no eligió, el modo del teléfono. */
export const ProveedorTema = ({ children }: { readonly children: ReactNode }) => {
  const { tema: store } = useCasos();
  const [tema, setTema] = useState<Tema>(() => store.cargar() ?? delSistema());

  useEffect(() => {
    document.documentElement.dataset['tema'] = tema;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', FONDO[tema]);
  }, [tema]);

  const cambiar = (t: Tema): void => {
    store.guardar(t);
    setTema(t);
  };
  return <TemaContexto.Provider value={{ tema, cambiar }}>{children}</TemaContexto.Provider>;
};

const useTema = (): Contexto => {
  const c = useContext(TemaContexto);
  if (!c) throw new Error('Falta ProveedorTema');
  return c;
};

/** Botón de la cabecera: pasa al siguiente modo de colores (claro → oscuro → suave → claro) y muestra a cuál va. */
export const CambiarTema = () => {
  const { tema, cambiar } = useTema();
  const otro = SIGUIENTE[tema];
  return (
    <Boton variante="secundario" aria-label={`COLORES: ahora ${tema}. Cambiar a ${otro}`} onClick={() => { cambiar(otro); }}>
      {ETIQUETA[otro]}
    </Boton>
  );
};
