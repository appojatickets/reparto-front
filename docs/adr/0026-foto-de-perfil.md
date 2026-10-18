# 0026 — Foto de perfil

Estado: aceptada. Pedido del dueño, 2026-10-10. Contrato y razones de seguridad: ADR 0039 del back.

## Decisión
- **Mi perfil** (`/perfil`, cualquier rol): foto grande (128 px), nombre, usuario y rol; **SUBIR / CAMBIAR MI FOTO** y **QUITAR MI FOTO** (con confirmación).
- La foto se recorta en cuadrado desde el centro y se baja a 256 px (~40 KB, WebP o JPEG) en el teléfono antes de subirla (`Imagenes.recortarAvatar`); se sube directo
  al almacenamiento con la URL firmada que pide la API.
- **Dónde se ve:** cabecera (chica, con el nombre; es el enlace al perfil), saludo del inicio (mediana, con «MI PERFIL» o «PONER MI FOTO») y lista de USUARIOS (chica).
  Sin foto, o si no carga, se ven las iniciales en el mismo círculo.
- `Avatar` pide la URL firmada solo si la persona tiene `fotoEn`, la recuerda hasta que venza y la comparte entre todas las filas que la necesiten. Si la
  persona cambia su foto, `fotoEn` cambia y se pide otra. El círculo es decorativo (`aria-hidden`): el nombre ya está al lado.
- La sesión recuerda `fotoEn` (login y `/v1/me`); al subir o quitar, `cambiarFoto` actualiza la cabecera y el inicio al instante.
- Mismo estilo de siempre: borde grueso, contraste alto, objetivos táctiles ≥ 64 px.
