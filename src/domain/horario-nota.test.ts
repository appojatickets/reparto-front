import { describe, expect, it } from 'vitest';
import { horarioDeNota, pareceHorario } from './horario-nota';

const t = (desde: string, hasta: string) => ({ desde: min(desde), hasta: min(hasta) });
const min = (hhmm: string): number => {
  const [h = '0', m = '0'] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
};
const FIN = 1439;

describe('horario escrito en la nota', () => {
  it.each([
    ['De 7 AM a 10 pm horario continuo | En lo posible entregar temprano', [t('7:00', '22:00')]],
    ['10 AM a 8 Pm horario continuo | Loicafe', [t('10:00', '20:00')]],
    ['10:30 AM a 8 PM horario continuo', [t('10:30', '20:00')]],
    ['8:30 AM a 5 PM', [t('8:30', '17:00')]],
    ['10 AM hasta 6 pm horario continuo', [t('10:00', '18:00')]],
    ['8 AM a 8 PM | Horario continuo', [t('8:00', '20:00')]],
    ['De 9am a 9:30 pm horario continuo', [t('9:00', '21:30')]],
    ['De 9 am a 12 pm | Minimarket Pahuilmo', [t('9:00', '12:00')]],
    ['Desde las 7:30 am hasta 10 pm horario continuo', [t('7:30', '22:00')]],
    ['Desde las 8am a 3 pm después no', [t('8:00', '15:00')]],
    ['Desde las 9 am hasta las 2:30 pm', [t('9:00', '14:30')]],
  ])('un solo tramo: «%s»', (nota, esperado) => {
    expect(horarioDeNota(nota)).toEqual(esperado);
  });

  it.each([
    ['7 AM a 1 pm y 4 pm a 7:30 pm día normal | Feriado de 9 am a 1 pm', [t('7:00', '13:00'), t('16:00', '19:30')]],
    ['7:30 AM 2 pm y de 3:30 pm a 8 pm', [t('7:30', '14:00'), t('15:30', '20:00')]],
    ['De 7am a 2pm y de 3:30pm a 8 pm', [t('7:00', '14:00'), t('15:30', '20:00')]],
    ['De 9am a 2pm y de | 3pm a 9pm', [t('9:00', '14:00'), t('15:00', '21:00')]],
  ])('con colación (dos tramos): «%s»', (nota, esperado) => {
    expect(horarioDeNota(nota)).toEqual(esperado);
  });

  it.each([
    ['Desde 9 am horario continuo', [t('9:00', '23:59')]],
    ['Desde las 11 AM en adelante horario continuo', [t('11:00', '23:59')]],
    ['Desde las 12 pm en adelante horario continuo | Pomaire', [t('12:00', '23:59')]],
    ['Abre a las 11:30 | Minimarket San Manuel', [t('11:30', '23:59')]],
    ['Desde las 9', [t('9:00', '23:59')]],
    ['Cierra a las 2 pm', [t('0:00', '14:00')]],
    ['Recibe hasta las 2:30 pm', [t('0:00', '14:30')]],
  ])('solo abre o solo cierra: «%s»', (nota, esperado) => {
    expect(horarioDeNota(nota)).toEqual(esperado);
  });

  it('«cierra de X a Y» es una colación: atiende antes y después', () => {
    expect(horarioDeNota('Cierra de 2 a 4 pm')).toEqual([t('0:00', '14:00'), t('16:00', '23:59')]);
    expect(horarioDeNota('Cierra de 2:30 a 4:00 pm')).toEqual([t('0:00', '14:30'), t('16:00', '23:59')]);
  });

  it('apertura y cierre en partes separadas se combinan', () => {
    expect(horarioDeNota('11:30 apertura | 13 a 15 cierre')).toEqual([t('11:30', '13:00'), t('15:00', '23:59')]);
  });

  it('lo que dice «después de las 4 pm no» no cambia el horario ya leído', () => {
    expect(horarioDeNota('Desde las 8am hasta las 4 pm horario continuo | Después de las 4 pm no')).toEqual([t('8:00', '16:00')]);
  });

  it('un teléfono en la nota no se toma por una hora', () => {
    expect(horarioDeNota('9 am a 10 pm horario continuo | 56964210408 Rodrigo romero | En la carretera cartel verde')).toEqual([t('9:00', '22:00')]);
    expect(horarioDeNota('56964210408 Rodrigo')).toBeUndefined();
  });

  it.each(['A la chilena', 'Almacén la torre', 'Maps lo marca cerrado temporalmente', 'A primera hora , abren temprano', 'Se repone', 'Cierra a las 2', 'De 2 a 4', 'Local 24 horas', 'De 10 pm a 2 am'])('si no queda claro no adivina: «%s»', (nota) => {
    expect(horarioDeNota(nota)).toBeUndefined();
  });

  it('distingue una nota con horario de una que solo tiene números sueltos', () => {
    expect(pareceHorario('De 9 am a 12 pm')).toBe(true);
    expect(pareceHorario('Desde las 9')).toBe(true);
    expect(pareceHorario('Portón verde, casa 12')).toBe(false);
    expect(pareceHorario('Almacén la torre')).toBe(false);
  });

  it('el último minuto del día es 23:59', () => {
    expect(horarioDeNota('Abre a las 11:30')?.at(-1)?.hasta).toBe(FIN);
  });
});
