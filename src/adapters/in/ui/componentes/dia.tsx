import { useState } from 'react';
import { fechaEnChile, fechaLarga, sumarDias } from '../../../../domain/fechas';
import { Campo, Selector } from './ui';

type Dia = 'hoy' | 'manana' | 'otro';

/** Día de reparto: hoy, mañana u otra fecha. Devuelve la fecha elegida (vacía mientras falte la «otra») y los campos. */
export const useDiaDeReparto = (ahora: () => Date) => {
  const hoy = fechaEnChile(ahora());
  const [dia, setDia] = useState<Dia>('hoy');
  const [otra, setOtra] = useState('');
  const fecha = dia === 'hoy' ? hoy : dia === 'manana' ? sumarDias(hoy, 1) : otra;
  const campos = (
    <>
      <Selector etiqueta="Día de reparto" value={dia} onChange={(e) => { setDia(e.target.value as Dia); }}>
        <option value="hoy">Hoy</option>
        <option value="manana">Mañana</option>
        <option value="otro">Otro día</option>
      </Selector>
      {dia === 'otro' ? <Campo etiqueta="Fecha" type="date" value={otra} onChange={(e) => { setOtra(e.target.value); }} /> : null}
      {fecha !== '' ? <p role="status"><strong>Se reparte el {fechaLarga(fecha)}</strong></p> : null}
    </>
  );
  return { fecha, campos };
};
