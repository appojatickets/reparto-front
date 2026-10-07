# 0014 — Fotos verificadas: «por verificar» y «verificadas»

Estado: aceptada. Pedido del dueño, 2026-10-07: cada día se suben fotos; «si coloco un ✓ queda verificada y sale de la revisión, y las que no están verificadas las veo aparte: dos listas». Complementa el ADR 0012; el back está en su ADR 0023.

## Qué cambia en «REVISAR FOTOS»
- **Por verificar (N):** las fotos vigentes que todavía no se han mirado, las subidas más nuevas primero. Cada tarjeta trae la foto, el local, quién la subió y cuándo, y dos salidas: **✓ VERIFICADA** (la da por buena y sale de la lista) o **ELIMINAR LA FOTO** (pide confirmar; el local queda sin foto).
- **Verificadas (N):** las que ya se revisaron, la verificación más reciente primero, con quién y cuándo. Están **ocultas hasta tocar VER LAS VERIFICADAS** para no cargar decenas de fotos ya revisadas. Cada una se puede **VOLVER A POR VERIFICAR** (por si se marcó sin querer) o eliminar.
- **Reportadas:** igual que antes. **LA FOTO ESTÁ BIEN** además deja la foto verificada, así no reaparece en «por verificar».
- Una foto nueva (o cambiada) de un local siempre llega «por verificar»: la verificación es de esa foto, no del local.
- Se verifica **la foto que se vio**: si mientras tanto el local cambió de foto, el servidor responde 409; la pantalla avisa y vuelve a leer la lista en vez de dar por buena una foto que nadie miró.
- Las fotos que ya estaban subidas antes de este cambio quedan todas «por verificar»; basta marcarlas una vez.

## Contrato
`GET /v1/fotos/revision` devuelve `reportadas`, `porVerificar` y `verificadas` (ya no existe `recientes`). `PUT /v1/locales/{id}/foto/verificacion` con `{ fotoPath, verificada }` (puerto `verificarFoto`).
