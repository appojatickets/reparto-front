# 0028 — Quiénes aportaron al local (reconocimiento discreto)

Estado: aceptada. Pedido del dueño, 2026-10-10 (reglas y datos: ADR 0041 del back).

## Decisión
- `Contribuyentes`: una fila chica («Aportaron: Juan Pérez y 2 más») con hasta 3 fotos de perfil superpuestas (`Avatar` tamaño `mini`) que, al tocarla, se despliega en una lista
  con foto, nombre y lo que aportó cada uno. Cerrada por defecto para no estorbar; `aria-expanded` y botón de 4 rem como el resto de la app.
- Aparece en el detalle de la parada de la ruta (solo si la parada tiene foto y pin) y en la ficha del local (si tiene foto y pin). Pide la lista al montarse; si el local aún no cumple
  las condiciones del servidor (más de una entrega o pin verificado) la lista viene vacía y no se muestra nada.
- No se pide en listas largas (LOCALES POR COMUNA) para no hacer una consulta por local.
