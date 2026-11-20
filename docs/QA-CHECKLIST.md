# Checklist de QA antes de lanzar

Marca cada punto en el sitio publicado (no solo en local). Usa `?frma_internal=1` para que tus pruebas queden como tráfico interno.

## Automático
- [ ] `npm test` en verde (33 pruebas unitarias)
- [ ] `npm run lint` sin errores
- [ ] `npm run build` sin errores
- [ ] `npm run test:e2e` en verde (ver README §9)

## Navegación
- [ ] Menú superior y pie: todos los enlaces llevan a una página válida (sin 404)
- [ ] Menú móvil abre, navega y se cierra
- [ ] Inicio → "Descubre FRMA 01" → página de la cápsula
- [ ] Catálogo: filtros categoría, color y precio funcionan, combinados y con "Limpiar filtros"
- [ ] `/catalogo?categoria=poleras` abre filtrado
- [ ] Producto: cambiar color cambia imagen y URL; sin talla muestra error; con talla agrega
- [ ] FRMA 01: muestra 7 piezas, 10 looks, precio por separado ($204.930), precio cápsula y ahorro
- [ ] Carrito: +/−, eliminar, subtotal correcto; el contador del ícono se actualiza; persiste al recargar
- [ ] Checkout: resumen, despacho "Por confirmar", botón "Continuar con mi pedido"
- [ ] Prelanzamiento: dice claramente que **no se recibe pedido ni pago** y que **no se cobró nada**
- [ ] Página inexistente muestra 404 con botón al inicio

## Responsive
- [ ] iPhone pequeño (375 px), iPhone grande, Android, tablet y escritorio
- [ ] Sin scroll horizontal en ninguna página
- [ ] Botones de al menos 44 px de alto, texto legible sin zoom
- [ ] Abrir desde el navegador interno de **Instagram** (pegar el enlace en un DM propio y abrirlo)

## Consentimiento
- [ ] Primera visita: aparece el banner; F12 → Network: **ninguna** petición a google / facebook / clarity
- [ ] "Rechazar": sigue sin peticiones de terceros al navegar
- [ ] "Configurar": permite activar solo analítica o solo publicidad
- [ ] Pie → "Preferencias de cookies" reabre el panel con lo elegido
- [ ] Retirar un permiso recarga la página y deja de enviar a esa plataforma
- [ ] Aceptar en una página de producto: se registra el `page_view` y `view_item` de esa página

## Eventos (GA4 DebugView + Meta Pixel Helper + consola con debug activo)
- [ ] `page_view` una sola vez por página (sin duplicados)
- [ ] `view_item_list` en inicio y catálogo; `select_item` al hacer clic en un producto
- [ ] `view_item` en producto y en FRMA 01 (cápsula con `item_category2 = capsula`)
- [ ] `add_to_cart` / `remove_from_cart` con `item_variant` (color/talla), `quantity`, `price`, `value`, `currency=CLP`
- [ ] `view_cart`, `begin_checkout` con todos los `items`
- [ ] `purchase_intent` **solo** al pulsar "Continuar con mi pedido"
- [ ] `generate_lead` **solo** tras registro exitoso (no al repetir un correo, no si falla)
- [ ] Meta: PageView, ViewContent, AddToCart, InitiateCheckout, PurchaseIntent (custom), Lead — **nunca Purchase**
- [ ] Ningún evento contiene correos ni nombres
- [ ] Con un experimento activo: los eventos llevan `experiment_id` y `variant_id`

## Formularios
- [ ] Correo inválido → mensaje de error
- [ ] Sin marcar consentimiento → no envía
- [ ] Registro válido → "¡Listo! Te avisaremos." y fila en Supabase `leads`
- [ ] Mismo correo otra vez (con mayúsculas o espacios) → "Ya estabas en la lista", sin fila nueva
- [ ] Sin Supabase configurado → mensaje "El registro aún no está habilitado" (no finge éxito)

## Atribución
- [ ] Llegar con `?utm_source=instagram&utm_medium=paid_social&utm_campaign=prueba&fbclid=abc` y registrarse → el lead tiene esos UTM y `has_fbclid = true`
- [ ] Navegar varias páginas antes de registrarse no pierde los UTM
- [ ] GA4 → Adquisición de tráfico muestra la campaña de prueba
- [ ] `/admin/experiment` → filtro "Interno" muestra tus pruebas; "Real" no

## Ausencia de pagos y órdenes
- [ ] Ninguna página pide tarjeta, RUT, dirección ni teléfono
- [ ] No existe tabla ni registro de "órdenes"
- [ ] Ningún texto dice "compra realizada", "pedido confirmado" ni similar
- [ ] No hay integración con pasarelas de pago

## Panel y seguridad
- [ ] `/admin/experiment` sin sesión → redirige a login
- [ ] Usuario de Supabase **no** incluido en `ADMIN_EMAILS` → no ve datos
- [ ] `/api/admin/leads` sin sesión → 401
- [ ] Registro de nuevos usuarios desactivado en Supabase Auth
- [ ] `SUPABASE_SERVICE_ROLE_KEY` no aparece en el código fuente del navegador (F12 → Sources → buscar "service")
