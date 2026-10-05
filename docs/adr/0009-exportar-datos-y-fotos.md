# 0009 — Exportar datos configurables y manejo de fotos

Estado: aceptada. Pedido del dueño, 2026-10-05: «exportar los datos que sean configurables (comunas, razón social, direcciones, RUT…) en el panel admin» y «comenzaré a tomar fotos y subirlas en las rutas: esa opción también debe estar y manejarse».

## Exportar (solo admin, permiso `datos:exportar`)
- Pantalla **EXPORTAR DATOS** (`/admin/exportar`) en tres pasos: **qué locales** (comunas, pin con/sin/aproximado, foto con/sin, texto), **qué datos** (columnas a elección: razón social, RUT, giro, dirección, comuna, latitud, longitud, enlace de Google Maps, estado y fuente del pin, nota, foto, estado del cliente, fecha de creación, ids) y **descargar**.
- Antes de descargar se ve cuántos son, cuántos tienen pin y foto, y una vista previa de 5 filas. Si cambia un filtro hay que volver a consultar: lo descargado siempre es lo que dicen los filtros.
- La API entrega las filas (`GET /v1/exportaciones/locales`, máximo 50.000); el **CSV se arma en el teléfono o computador** (`domain/exportacion.ts`): con BOM (Excel lee las tildes), líneas CRLF, y dos formatos: *Excel en español* (punto y coma, decimales con coma) o *estándar* (coma y punto decimal).
- Seguridad: una celda de texto que empieza con `= + - @` se antecede con una comilla para que Excel no la tome por fórmula (los datos vienen de choferes y vendedores). Los números no se tocan.
- Las columnas y el formato elegidos se recuerdan en el dispositivo.

## Fotos
- Subir: ya existía (el chofer al llegar, o desde la ficha del local). La foto es del equipo, no de Google.
- Nuevo: **QUITAR FOTO** en la ficha del local (admin y despachador): `DELETE /v1/locales/:id/foto` borra el archivo del almacén y deja el local sin foto (idempotente). Al **cambiar** una foto, la anterior se borra del almacén (no quedan huérfanas).
- La exportación permite filtrar por con/sin foto y cuenta la cobertura, para saber a qué locales falta fotografiar.
