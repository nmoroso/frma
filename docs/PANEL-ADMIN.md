# Panel de administración de FRMA — guía de uso

El panel te permite manejar **productos, colores, fotos, modelos, guardarropas e imágenes del inicio** sin tocar código ni volver a desplegar. Lo que publicas aparece en la tienda **al instante**.

Dirección: `https://tudominio.cl/admin`

---

## 0. Configuración inicial (una sola vez)

Necesitas tener Supabase conectado (ver [GUIA-INTEGRACIONES.md](GUIA-INTEGRACIONES.md), paso 1). Luego:

1. **Actualiza la base de datos.** Supabase → **SQL Editor** → **New query** → pega todo el archivo `supabase/schema.sql` → **Run**. Es seguro ejecutarlo aunque ya lo hayas hecho antes: crea las tablas nuevas (productos, colores, fotos, modelos…), el almacenamiento de fotos (bucket `media`) y los permisos.
2. **Crea tu usuario administrador** (si no lo hiciste): Supabase → **Authentication → Users → Add user → Create new user** → tu correo y una contraseña larga → marca **Auto Confirm User**.
3. **Autoriza tu correo:** en Vercel → Settings → Environment Variables → `ADMIN_EMAILS=tu@correo.cl` (varios separados por coma) → **Redeploy**.
4. Desactiva el registro público: Supabase → **Authentication → Sign In / Providers** → apaga **Allow new users to sign up**.
5. Entra a `/admin/login`, ingresa y, en el **Resumen**, presiona **Importar catálogo inicial**.
   Esto copia a la base de datos los 4 productos actuales con sus 9 colores, precios y textos, el guardarropa **FRMA 01** con sus 7 piezas y 3 modelos ficticios. No borra ni sobrescribe nada que ya exista.

> Mientras no importes el catálogo, la tienda sigue mostrando el catálogo original, así que no hay tiempo "en blanco".

---

## 1. Cargar un producto (el flujo de todos los días)

1. **Productos** → elige uno o presiona **+ Nuevo producto** (nombre y categoría). Los productos nuevos nacen como **borrador** (no se ven en la tienda).
2. Completa **Información** (nombre, categoría, precio en pesos, frase corta, descripción), **Detalles** (material y composición, características y calce, cuidados) y **Tallas del producto**.
3. En **Colores**, presiona **+ Agregar color**.
4. Escribe el **nombre comercial** (ej.: "Azul marino") y elige el **tono del círculo**:
   - con el **selector de color** (cuadrado de color),
   - escribiendo el **código HEX** (ej.: `#202C40`), o
   - con el **Cuentagotas**: se abre una foto de ese color; haz clic **sobre la prenda** (no sobre el fondo ni la piel). Toma el promedio de un área pequeña para evitar el ruido de la tela. Puedes hacer clic varias veces hasta dar con el tono y luego **Usar este color**.
   > El sistema **no** adivina el color de la foto automáticamente (podría tomar el fondo o la piel del modelo): tú eliges el punto exacto.
5. **+ Agregar fotos**: arrastra varias fotos a la vez o haz clic para elegirlas. Verás una barra de progreso por foto. También puedes ir a la pestaña **Elegir de la biblioteca** para reutilizar fotos ya subidas.
6. **Ordena** las fotos arrastrándolas (o con las flechas ← →). La **primera es la principal**; usa **★** para convertir cualquier foto en principal. Con **✎** editas su texto alternativo, tipo o la reemplazas.
7. Presiona **Guardar cambios** (barra inferior).
8. **Vista previa**: abre el producto tal como lo verá un cliente (también si es borrador).
9. **Guardar y publicar**. Desde ese momento aparece en la tienda.

### Opciones de cada color
| Campo | Para qué sirve |
|---|---|
| Nombre comercial | Lo ve el cliente bajo los círculos y en el carrito |
| Tono (HEX) | Color del círculo selector en la tienda |
| SKU | Identificador único del color (lo usa la analítica como `variant_id`). **Generar** propone uno |
| Precio específico | Opcional. Vacío = usa el precio del producto |
| Tallas | Por defecto usa las del producto; desactiva "Usar las tallas del producto" para elegir otras |
| Activo | Desactívalo para ocultar ese color sin borrarlo |
| Fotos | Galería propia: en la tienda **solo** se muestran las fotos del color elegido |

### Otras acciones (en la lista de Productos)
- **Publicar / Despublicar**: muestra u oculta el producto de la tienda (no borra nada).
- **Duplicar**: crea una copia como borrador (con sus colores y fotos). Útil para productos parecidos.
- **Eliminar**: pide confirmación. Borra el producto y sus colores; las fotos quedan en la biblioteca.
- **▲▼ + Guardar orden**: orden de aparición en el catálogo.

> Para publicar, el sistema exige precio mayor a $0, al menos un color activo y tallas. Si falta algo, te lo dice con un mensaje claro.

---

## 2. Biblioteca de imágenes

Todas las fotos en un solo lugar. Puedes:
- **Subir** varias a la vez (arrastrar y soltar o elegir), indicando el **tipo** y si son **generadas con IA**.
- **Buscar y filtrar** por tipo, producto, IA, sin usar o sin texto alternativo.
- Abrir una foto para editar su **texto alternativo**, **tipo** (producto individual, sobre modelo, detalle, outfit completo, editorial/campaña), marca de **IA**, y las **prendas que aparecen** (producto + color; varias si es un outfit).
- Ver **dónde se usa** cada foto.
- **Reemplazar archivo**: cambia la foto en todos los lugares donde se usa.
- **Eliminar** (una o varias): pide confirmación y avisa si la foto está en uso.

**Formatos permitidos:** JPG, PNG, WebP o AVIF, hasta 25 MB. Las fotos HEIC del iPhone no se aceptan: expórtalas como JPG (en el iPhone: Ajustes → Cámara → Formatos → **Más compatible**).

**Optimización automática:** al subir, cada foto se corrige de orientación, se reduce a **2400 px** en su lado más largo y se convierte a **WebP** (calidad 86): suficiente para zoom en una tienda de moda, mucho más liviana. Después, la tienda entrega a cada pantalla el tamaño justo (y AVIF/WebP según el navegador).

**Imágenes con IA:** las fotos marcadas como IA muestran la etiqueta **"Imagen conceptual"** en la tienda.

**Recomendaciones de foto:** formato vertical **4:5** (ej. 1600×2000 px o más), fondo neutro, misma luz para todos los colores; por color: frontal, posterior y sobre modelo.

---

## 3. Modelos

Los 3 modelos ficticios de FRMA (puedes crear más). Para cada uno: nombre o identificador, edad aproximada, notas, **foto de referencia** y **galería**.

Al agregar fotos a la galería se abre la ficha de la primera foto para indicar **qué prendas lleva** (producto y color). Para un outfit completo, agrega cada prenda. Para las demás fotos usa ✎. Debajo verás **Productos y colores asociados**.

> Si quieres que una foto con modelo aparezca en la ficha de un producto, agrégala también a la galería de ese color (en el editor del producto → Agregar fotos → Elegir de la biblioteca → "Solo etiquetadas con…").

---

## 4. Guardarropas y colecciones

Conjuntos que se venden juntos, como **FRMA 01**. Para cada uno: nombre, frase, descripción, **precio del guardarropa** (el panel calcula el precio por separado y el ahorro), **prendas** (producto + color + si es superior o pantalón), **tallas**, **foto principal** y **fotos de outfits**.

Las combinaciones se calculan solas: prendas superiores × pantalones. FRMA 01 se ve en `/frma-01`; otros guardarropas en `/guardarropa/<id>`.

---

## 5. Imágenes de la página principal

Cambia cada sección y presiona **Guardar** en esa sección:

| Sección | Dónde aparece |
|---|---|
| Imagen principal de portada | Junto al mensaje "Tu ropero, resuelto" |
| Banners | Fotos a todo el ancho con título y enlace opcionales |
| Foto del guardarropa destacado | Bloque FRMA 01 del inicio |
| Categoría: … | Accesos a cada categoría |
| Imágenes editoriales | Fotos de campaña (hasta 4) |
| Fotografías destacadas | Grilla con título y enlace (hasta 8) |

Si una sección queda vacía, el inicio usa el diseño por defecto. Los enlaces deben empezar con `/` (página de la tienda, ej. `/frma-01`) o `https://`.

---

## 6. Qué ve el cliente

- **Círculos de color** en el catálogo y en la ficha. El seleccionado tiene un anillo exterior; los colores claros tienen borde visible.
- Al elegir un color, **en la misma página** cambian al instante: foto principal, galería completa (solo fotos de ese color), nombre del color, tallas disponibles y precio (si el color tiene uno propio). La dirección se actualiza (`?color=azul-marino`) para poder compartirla.
- Funciona con mouse, toque y **teclado** (Tab para entrar, flechas para cambiar de color).
- El carrito guarda **producto + color + talla**.
- No se aplican filtros para "recolorear" fotos: cada color muestra sus propias imágenes. Si un color no tiene fotos, se ve una ilustración.

---

## 7. Analítica de colores

Además de los eventos anteriores, la tienda registra:

| Evento | Cuándo | Parámetros |
|---|---|---|
| `select_color` | El cliente elige otro color (catálogo o ficha). Nunca al cargar la página | `product_id`, `product_name`, `variant_id` (SKU), `color_name` |
| `view_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `purchase_intent` | Como antes | Cada ítem incluye `item_variant` = nombre del color, `item_variant_id` = SKU y `item_size` = talla |

Respeta el consentimiento de cookies (sin permiso no se envía nada), no se duplica al cambiar de color y nunca se envía `purchase`. El panel **Resultados del smoke test** incluye la tabla **Preferencia por color**. Para verlos en GA4, registra las dimensiones nuevas (ver GUIA-INTEGRACIONES.md §2.2).

---

## 8. Seguridad (cómo está protegido)

- Solo entran al panel usuarios de **Supabase Auth** cuyo correo esté en `ADMIN_EMAILS`. Cada acción vuelve a verificarlo en el servidor.
- Los visitantes **no pueden leer ni escribir** la base de datos: la tienda la consulta desde el servidor y solo muestra lo **publicado**.
- Las fotos se suben con **URLs firmadas** que el servidor entrega solo a administradores; el almacenamiento solo acepta JPG/PNG/WebP/AVIF de hasta 8 MB.
- Guardar un producto es **atómico**: si algo falla (por ejemplo, un SKU repetido) no se guarda nada a medias.
- Las páginas del panel y las vistas previas **no se miden** en la analítica.

---

## 9. Problemas frecuentes

| Mensaje | Qué hacer |
|---|---|
| "Falta actualizar la base de datos" | Ejecuta de nuevo `supabase/schema.sql` |
| "Falta configurar Supabase" | Revisa `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` en Vercel |
| Ingreso exitoso pero vuelve al login | Tu correo no está en `ADMIN_EMAILS` (o falta Redeploy) |
| "Ese SKU ya lo usa otro producto" | Cambia el SKU o usa **Generar** |
| La foto no se puede subir | Revisa el formato (no HEIC/GIF) y el tamaño (≤ 25 MB) |
| Cambié algo y no se ve | Revisa que el producto esté **Publicado** y el color **Activo**; recarga la página |
| "Tu sesión expiró" | Vuelve a ingresar en `/admin/login` |

---

## 10. Pruebas automáticas del panel (para quien mantenga el código)

`tests/e2e/admin.mjs` recorre el panel completo contra un Supabase **de pruebas** (nunca producción): importación, fotos, cuentagotas, precio y tallas por color, modelos, inicio, borrador/vista previa/publicación, duplicar, eliminar, permisos y la tienda (cada color muestra solo sus fotos, eventos `select_color` e `item_variant`).

Con Docker instalado puedes levantar Supabase local con `npx supabase start` (desactiva `realtime` en `supabase/config.toml` si tu equipo no tiene IPv6), aplicar `supabase/schema.sql`, crear un usuario y ejecutar:

```bash
BASE_URL=http://localhost:3100 ADMIN_EMAIL=... ADMIN_PASSWORD=... PHOTOS_DIR=carpeta-con-fotos npm run test:e2e:admin
```
