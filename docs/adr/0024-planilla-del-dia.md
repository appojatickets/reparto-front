# 0024 — Planilla del día en la app (ver ADR 0036 del back)

Estado: aceptada. Pedido del dueño, 2026-10-07.

## Decisión
- **PLANILLA DEL DÍA** (admin y despachador, `/planilla`): se pega la planilla de la mañana tal como sale de Excel. Los títulos se reconocen por
  nombre y en cualquier orden: *Chofer*, *Ayudante*, *Camión* o *Patente*, *Vendedor* y, si la trae, *Comuna*. Una fila sin patente se salta.
- **Vista previa antes de aplicar**: por camión, quiénes van, vendedores (`V12 Mario Quiroz - V13 Oscar Baeza`) y comunas. Si falta la columna
  del camión se avisa y no se deja aplicar.
- **Resultado fila por fila**: camión nuevo (y el nombre de dos dígitos que se le puso, o el aviso de ponerle uno si otro termina igual),
  vendedores nuevos (falta cargarles el celular), quién quedó **sin usuario** (con enlace a USUARIOS) y a quién ya se le dejó el camión elegido.
  Una fila mala no frena a las demás.
- **CABINET** (quien entrega las máquinas/freezers, no los helados) no es un camión: si aparece en la columna del camión se omite y se avisa
  («Se omite CABINET: entrega las máquinas, no los helados»); no se manda a la API.
- **Chofer y ayudante**: el inicio muestra lo que dice la planilla de su camión (ayudante, comunas y vendedores).
- **ESTÁ CERRADO**: el WhatsApp se ofrece solo a los vendedores de ese camión; sin planilla, a todos los activos como antes.
- **Cargar entregas**: si la comuna de la dirección no está entre las del camión se avisa («Ojo: Maipú no está entre las comunas de tu camión»),
  sin impedir la carga.
