/** Si el teléfono muestra las horas estimadas de llegada en la ruta (apagado hasta que la persona lo pida). */
export interface HorasStore {
  cargar(): boolean;
  guardar(ver: boolean): void;
}
