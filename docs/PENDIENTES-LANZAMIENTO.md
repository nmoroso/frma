# Pendientes antes de lanzar campañas

Lista de lo que **requiere tu confirmación o decisión**. Nada de esto se inventó en el código: donde faltaba información se dejó marcado como "pendiente".

## Negocio y producto
- [ ] **Precios** (`src/config/pricing.ts`): validar contra costos de proveedor, importación, despacho, comisiones y margen. Luego `PRICES_VALIDATED = true`.
- [ ] **Precio de FRMA 01** y descuento comunicado (hoy 12% vs. comprar por separado).
- [ ] **Materiales, gramajes, calce, origen y cuidados** de cada prenda (hoy "Pendiente de verificar" en `catalog.ts`).
- [ ] **Guía de tallas** (poleras S–XXL; pantalones 38–48: confirmar sistema de tallas con el proveedor).
- [ ] **Colores finales** y que coincidan con las muestras físicas.
- [ ] **Fotografías**: súbelas en el panel (`/admin`), una galería por color; marca como **IA** las generadas con inteligencia artificial (se rotulan "Imagen conceptual"). No usar imágenes de otras marcas.
- [ ] **Colores**: verifica que el HEX de cada círculo se parezca al color real de la prenda (usa el cuentagotas sobre una foto con buena luz).
- [ ] **SKU**: reemplaza los SKU generados (`POLERA-ESSENTIAL-BLANCO`) por los del proveedor si existen.
- [ ] **Despacho**: operador, cobertura, plazos y costos (hoy "Por confirmar").
- [ ] **Nombre de marca**: FRMA es provisional. Revisar disponibilidad en INAPI (marca), NIC Chile (dominio) e Instagram.
- [ ] **Correo de contacto** real (`NEXT_PUBLIC_CONTACT_EMAIL`) y que alguien lo revise.

## Legal (Chile) — revisar con un abogado
- [ ] **Protección de datos personales**: Ley 19.628 y la nueva **Ley 21.719** (vigencia plena desde diciembre de 2026). Revisar base de licitud, información al titular, derechos (acceso, rectificación, supresión, oposición, portabilidad), plazos de conservación y transferencias internacionales (Supabase, Vercel, Google, Microsoft, Meta procesan datos fuera de Chile).
- [ ] **Identidad del responsable** de los datos (nombre/razón social, RUT, domicilio) en `/privacidad`.
- [ ] **Texto de consentimiento** del formulario (`SITE.leadConsentText`): separar consentimiento de "aviso de lanzamiento" y de "novedades/marketing" si el abogado lo recomienda. Si cambias el texto, sube `leadConsentVersion`.
- [ ] **Cookies**: confirmar que la clasificación "necesarias" incluye carrito, preferencias, asignación de variante A/B y UTMs guardados localmente; si no, moverlos tras el consentimiento.
- [ ] **Ley del Consumidor (19.496) y publicidad**: confirmar que exhibir precios de productos aún no disponibles en un sitio de prelanzamiento es aceptable con los avisos actuales (barra superior, pie de página, checkout y pantalla de prelanzamiento). Evaluar si agregar un aviso visible en las fichas de producto.
- [ ] **Experimentos de precio**: confirmar que mostrar precios distintos a distintos visitantes es aceptable (no hay venta, pero sí publicidad).
- [ ] **Grabaciones de Clarity**: confirmar que el aviso de cookies es suficiente.
- [ ] **Darse de baja**: definir cómo se procesa (hoy por correo; la tabla tiene `unsubscribed_at`). Cada correo de marketing debe incluir opción de baja.
- [ ] **Términos y condiciones**: no existen porque no hay venta; serán obligatorios antes de vender.

## Panel de administración
- [ ] Ejecutar `supabase/schema.sql` actualizado en el proyecto de Supabase de producción.
- [ ] Importar el catálogo inicial desde `/admin` y revisar que precios y textos coincidan.
- [ ] Desactivar "Allow new users to sign up" en Supabase Auth y usar contraseñas largas para los administradores.
- [ ] Revisar los cupos de Supabase Storage y de optimización de imágenes de Vercel según la cantidad de fotos (ver GUIA-INTEGRACIONES §8).
- [ ] Decidir quién más tendrá acceso (`ADMIN_EMAILS`). Todos los administradores pueden publicar y eliminar.

## Medición
- [ ] Cuentas creadas y variables cargadas en Vercel (GA4, Meta, Clarity, Supabase, `ADMIN_EMAILS`).
- [ ] GA4: dimensiones personalizadas (incluidas las de color: `product_id`, `color_name`, `variant_id`, `item_variant_id`, `item_size`), eventos clave, filtro de tráfico interno en *Probando*.
- [ ] Meta: dominio verificado, conversión personalizada `PurchaseIntent`, Pixel Helper sin errores.
- [ ] Definir **criterios de éxito** del smoke test ANTES de gastar (p. ej. "tasa de intención de compra ≥ X% de las sesiones con UTM de Instagram", "≥ N leads con CPL ≤ $Y").
- [ ] Definir **presupuesto y duración** de la campaña y tamaño mínimo de muestra por variante si usas A/B.
- [ ] Marcar los navegadores del equipo con `?frma_internal=1`.
- [ ] Recorrer completo el [QA-CHECKLIST](QA-CHECKLIST.md).

## Técnicos opcionales (no bloquean el lanzamiento)
- [ ] Captcha (Cloudflare Turnstile) si aparece spam en el formulario (hoy: campo trampa + tiempo mínimo + límite por IP + no duplicados).
- [ ] Límite de peticiones distribuido (Upstash/Vercel KV) si hay abuso de `/api/events`.
- [ ] Meta Conversions API (servidor) para mejorar la atribución con bloqueadores; requiere token y revisión legal.
- [ ] Correo de confirmación (doble opt-in) para los leads.
- [ ] Historial de cambios del catálogo (quién cambió qué) si el equipo crece.
