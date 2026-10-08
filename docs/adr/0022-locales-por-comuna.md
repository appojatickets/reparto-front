# 0022 — Locales por comuna: ver, buscar, editar y compartir

Estado: aceptada (2026-10-08). Complementa el ADR 0035 del back.

## Decisión
- Pantalla **LOCALES POR COMUNA** (`/locales`; acción `locales`: admin, despachador y chofer o ayudante con permiso de editor). Un buscador (nombre, RUT o dirección, con espera de 350 ms) y un selector de comuna con cuántos locales y cuántos sin pin tiene cada una.
- Los resultados se separan en **POR VERIFICAR (n)** —los sin pin también— y **VERIFICADOS (n)**, como en fotos. Cada local es una tarjeta con razón social, RUT con puntos y guion, giro, dirección, insignia del pin, lo entregado y la nota.
- **Acciones por local**: VERIFICAR PIN / QUITAR VERIFICACIÓN, VER EN EL MAPA (enlace al lugar, sin iniciar navegación), VER FOTO (la URL firmada se pide solo al tocarlo, para no cargar cientos de fotos), COMPARTIR, EDITAR y FICHA.
- **EDITAR** muestra todo en un solo formulario (razón social, RUT, giro, dirección, comuna, nota) y envía solo lo que cambió: primero los datos del cliente y luego los del local; si el primero falla (por ejemplo RUT repetido) lo dice y no sigue. La ubicación se pega con el mismo componente de siempre (enlace o coordenadas). ELIMINAR ESTA DIRECCIÓN pide confirmar y explica si la API lo impide por entregas hechas.
- **COMPARTIR**: con el menú del teléfono (`navigator.share`; con la foto si `canShare` acepta archivos) o, si no existe, ENVIAR POR WHATSAPP y COPIAR EL TEXTO. El mensaje es nombre, RUT, dirección, enlace al pin y lo entregado (`textoParaCompartir`, en el dominio).
- Se quita la planilla «Proponer pines»; la pantalla anterior queda como **PROPUESTAS DE PIN** (solo lo que propone el sistema).
- **Reportar la ubicación** también aparece en las paradas con pin aproximado (antes solo con pin preciso); el nombre se puede reportar siempre.

## Fuera de alcance
Paginar más de 500 locales por consulta (se avisa «se muestran N de M» y se pide afinar); un permiso más fino para ver los montos entregados.
