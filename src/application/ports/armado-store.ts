/** Cómo arma su ruta el chofer: «calcular» (el sistema la ordena) o «carga» (las agrega en el orden en que las va a entregar). */
export type Armado = 'calcular' | 'carga';

/** Recuerda la elección en este teléfono. Sin elección, la app pregunta una vez. */
export interface ArmadoStore {
  cargar(): Armado | undefined;
  guardar(a: Armado): void;
}
