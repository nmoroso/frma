# Guía de integraciones — paso a paso

Esta guía asume cero experiencia técnica. Los menús de cada plataforma cambian a veces de nombre: si no encuentras un botón exacto, busca el término entre comillas en la ayuda de la plataforma.

**Orden recomendado:** 1) Supabase → 2) Vercel (primer despliegue) → 3) GA4 → 4) Clarity → 5) Meta Pixel → 6) Verificación → 7) Looker Studio.

Dónde poner cada valor:
- **En tu computador:** archivo `.env.local` (copia de `.env.example`).
- **En producción:** Vercel → tu proyecto → **Settings → Environment Variables** → agrega nombre y valor → marca *Production* (y *Preview* si quieres) → **Save** → **Deployments → ⋯ → Redeploy**.

---

## 1. Supabase (leads, medición propia, login del panel)

### 1.1 Crear el proyecto
1. Entra a https://supabase.com → **Start your project** → crea una cuenta.
2. **New project**. Nombre: `frma`. Contraseña de base de datos: genera una segura y guárdala en tu gestor de contraseñas. **Región: South America (São Paulo)** (la más cercana a Chile).
3. Espera ~2 minutos a que se cree.

### 1.2 Crear las tablas
1. Menú izquierdo → **SQL Editor** → **New query**.
2. Abre el archivo `supabase/schema.sql` de este proyecto, copia todo, pégalo y presiona **Run**.
3. Debe decir *Success*. En **Table Editor** verás `leads` y `funnel_events`.

### 1.3 Obtener las claves
**Project Settings (engranaje) → API Keys** (o **Data API / API**):
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` (ej. `https://abcd.supabase.co`).
- Clave **anon** o **publishable** (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Clave **service_role** o **secret** (`sb_secret_…`) → `SUPABASE_SERVICE_ROLE_KEY`.

> ⚠️ La clave secreta da acceso total a la base de datos. Solo va en `.env.local` y en Vercel, **nunca** con prefijo `NEXT_PUBLIC_`, nunca en GitHub, nunca por chat o correo.

### 1.4 Usuario administrador (para `/admin/experiment`)
1. **Authentication → Sign In / Providers** (o *Providers → Email*): deja *Email* activado y **desactiva "Allow new users to sign up"** (así nadie más puede crearse cuenta).
2. **Authentication → Users → Add user → Create new user**: tu correo + una contraseña larga. Marca **Auto Confirm User**.
3. En las variables de entorno: `ADMIN_EMAILS=tu@correo.cl` (varios: separados por coma).
4. Entra a `https://tudominio.cl/admin/login`.

### 1.5 Verificar
- Regístrate en `/prelanzamiento` con un correo de prueba (marca el tráfico como interno antes: `?frma_internal=1`).
- En **Table Editor → leads** debe aparecer una fila con `is_internal = true`.
- Repite con el mismo correo: el sitio responde "Ya estabas en la lista" y no se crea otra fila.

---

## 2. Google Analytics 4

### 2.1 Crear la propiedad
1. https://analytics.google.com → **Comenzar a medir** (o *Administrar → Crear → Propiedad*).
2. Nombre: `FRMA`. Zona horaria: **Chile**. Moneda: **Peso chileno (CLP)**.
3. Plataforma: **Web**. URL: tu dominio. Nombre del flujo: `FRMA web`.
4. Desactiva en "Medición mejorada" la opción **Vistas de página → "Cambios en el historial del navegador"** (el sitio envía sus propios `page_view`; así evitas duplicados). Deja el resto como está.
5. Copia el **ID de medición** (`G-XXXXXXXXXX`) → `NEXT_PUBLIC_GA4_ID`.

### 2.2 Dimensiones personalizadas (para ver experimento, tipo de producto, etc.)
**Administrar → Definiciones personalizadas → Crear dimensión personalizada** (alcance *Evento*), una por cada fila:

| Nombre | Parámetro del evento |
|---|---|
| Tipo de producto | `product_type` |
| Experimento | `experiment_id` |
| Variante | `variant_id` |
| Interés del lead | `lead_interest` |
| Sesión FRMA | `frma_session_id` |

La distinción **cápsula vs. prenda individual** también viaja en cada ítem como **Categoría de artículo 2** (`item_category2` = `capsula` / `prenda_individual`), que GA4 ya reconoce sin configurar nada.

### 2.3 Eventos clave (conversiones)
Los eventos aparecen en **Administrar → Eventos** después de que alguien los dispare (hasta 24 h). Cuando aparezcan `purchase_intent` y `generate_lead`, márcalos como **evento clave** (estrella). No existe ni existirá `purchase`.

### 2.4 Separar tráfico interno
El sitio ya envía `traffic_type=internal` desde localhost, previews de Vercel y navegadores marcados con `?frma_internal=1`.
1. **Administrar → Filtros de datos** → verás "Internal Traffic" (si no existe: **Crear filtro → Tráfico interno**, parámetro `traffic_type` = `internal`).
2. Déjalo primero en estado **Probando** unos días (podrás comparar con la dimensión "Nombre del filtro de prueba"), luego cámbialo a **Activo**.
   ⚠️ Un filtro activo **elimina permanentemente** esos datos de GA4. El panel propio de FRMA sí conserva el tráfico interno separado.

### 2.5 Retención de datos
**Administrar → Recopilación y retención de datos → Retención de datos** → 14 meses (recomendado para análisis).

### 2.6 Verificar
1. Pon `NEXT_PUBLIC_ANALYTICS_DEBUG=true` (temporalmente), despliega.
2. Abre el sitio, acepta cookies y recorre: inicio → FRMA 01 → agregar → carrito → checkout → continuar.
3. GA4 → **Administrar → DebugView**: verás `page_view`, `view_item_list`, `select_item`, `view_item`, `add_to_cart`, `view_cart`, `begin_checkout`, `purchase_intent` con sus parámetros (`items`, `value`, `currency=CLP`).
4. En la consola del navegador (F12) verás líneas `[FRMA analytics] evento → destinos`.
5. Vuelve a poner `NEXT_PUBLIC_ANALYTICS_DEBUG=false` y redepliega.

---

## 3. Microsoft Clarity

1. https://clarity.microsoft.com → inicia sesión → **Add new project**. Nombre `FRMA`, URL de tu sitio.
2. Elige instalación **manual** (“Install manually”) — no la copies: el sitio ya trae el código.
3. **Settings → Overview**: copia el **Project ID** (ej. `abcd1234ef`) → `NEXT_PUBLIC_CLARITY_ID`.
4. **Settings → Masking**: deja **Balanced** o **Strict** (enmascara texto escrito por el usuario).
5. Verificar: acepta cookies en el sitio y navega. En 30 min–2 h verás grabaciones en **Recordings**. Puedes filtrar por **Custom tags**: `traffic_type` (real/internal) y el id de experimento.

Clarity también recibe los eventos del embudo (`add_to_cart`, `purchase_intent`, etc.) como *Smart events / Custom events* para filtrar grabaciones.

---

## 4. Meta Pixel

1. Necesitas un **Business Portfolio** (https://business.facebook.com) con tu cuenta de Instagram/Facebook vinculada.
2. **Events Manager** (Administrador de eventos) → **Connect data sources / Conectar orígenes de datos** → **Web** → nombre `FRMA Pixel` → **Create**.
3. Cuando pregunte cómo instalar, elige **instalar manualmente** y copia solo el **ID del píxel / Dataset ID** (número de ~15 dígitos) → `NEXT_PUBLIC_META_PIXEL_ID`.
4. El sitio desactiva la "configuración automática de eventos" para que Meta no invente eventos a partir de clics.

### Eventos que envía el sitio
| Momento | Evento Meta |
|---|---|
| Cada página | `PageView` |
| Ver producto o cápsula | `ViewContent` |
| Agregar al carrito | `AddToCart` |
| Entrar al checkout | `InitiateCheckout` |
| Pulsar "Continuar con mi pedido" | `PurchaseIntent` (**personalizado**) |
| Registro exitoso | `Lead` |

**Nunca se envía `Purchase`.** No configures campañas optimizadas para "Compra".

### Conversión personalizada para PurchaseIntent
Events Manager → **Custom conversions → Create** → origen: tu píxel → evento: `PurchaseIntent` → nombre "Intención de compra FRMA". Así podrás usarla como objetivo o columna en Ads Manager.

### Dominio
Business Settings → **Brand safety → Domains** → agrega y verifica tu dominio (método meta-tag o DNS). Recomendado para que los eventos se atribuyan bien.

### Verificar
- Instala la extensión de Chrome **Meta Pixel Helper**; acepta cookies y recorre el embudo: debe mostrar los eventos de la tabla, ninguno `Purchase`.
- Events Manager → tu píxel → **Test events**: abre el sitio desde ahí y verás los eventos en vivo.

---

## 5. Vercel — variables finales

Después de obtener todo, en Vercel deberías tener:

```
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_CONTACT_EMAIL
NEXT_PUBLIC_GA4_ID
NEXT_PUBLIC_META_PIXEL_ID
NEXT_PUBLIC_CLARITY_ID
NEXT_PUBLIC_ANALYTICS_DEBUG=false
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAILS
```

Luego **Redeploy**.

---

## 6. Verificación completa (15 minutos)

1. Abre el sitio en una ventana de incógnito con `?frma_internal=1&utm_source=prueba&utm_medium=test&utm_campaign=verificacion`.
2. Antes de aceptar cookies: F12 → pestaña **Network** → filtra por `google`, `facebook`, `clarity` → **no debe haber nada**.
3. Pulsa **Rechazar** → navega → sigue sin haber nada.
4. Pie de página → **Preferencias de cookies** → activa todo → **Guardar**.
5. Recorre el embudo completo y deja un correo de prueba.
6. Comprueba: GA4 DebugView, Meta Test Events / Pixel Helper, Clarity (más tarde), Supabase `leads` y `funnel_events`, y `/admin/experiment` con el filtro **Interno**.

---

## 7. Dashboard en Looker Studio (GA4)

El panel `/admin/experiment` usa la medición propia. Para analizar los datos de GA4 (incluye modelado y datos de anuncios):

1. https://lookerstudio.google.com → **Crear → Informe** → conector **Google Analytics** → elige la propiedad FRMA → **Agregar**.
2. Agrega un **control de periodo** y un **control de filtro** por *Fuente/medio de la sesión* y *Campaña de la sesión*.
3. Tablas y gráficos recomendados:

| Gráfico | Dimensión | Métricas |
|---|---|---|
| Resumen (scorecards) | — | Usuarios activos, Sesiones, Recuento de eventos filtrado por `purchase_intent`, Eventos clave (`generate_lead`) |
| Embudo por etapa | Nombre del evento (filtro: `view_item`, `add_to_cart`, `begin_checkout`, `purchase_intent`, `generate_lead`) | Usuarios totales, Recuento de eventos |
| Campañas | Fuente/medio de la sesión, Campaña de la sesión | Sesiones, Agregados al carrito, Checkouts, Eventos clave |
| Productos | Nombre del artículo, Categoría de artículo 2 | Artículos vistos, Artículos agregados al carrito, Artículos en checkout |
| Experimento | Variante (dimensión personalizada) | Sesiones, Recuento de eventos `purchase_intent` |

4. Tasas de conversión: crea campos calculados, por ejemplo `Intención/Sesiones = COUNT_IF…` o, más simple, usa **Usuarios con evento** en tablas separadas por evento y divide en una tabla dinámica.
5. Tráfico interno: si el filtro de GA4 está en *Probando*, filtra excluyendo *Nombre del filtro de prueba = Internal Traffic*.
6. Comparte el informe en modo **solo lectura** y, si quieres verlo en el panel, guarda el enlace en tus favoritos (no incrustes informes con datos en páginas públicas).

**Opcional — Supabase en Looker Studio:** conector **PostgreSQL**, host del *Session pooler* de Supabase (Project Settings → Database → Connection string), base `postgres`. Crea antes un usuario de solo lectura en SQL Editor (`create role lector login password '…'; grant usage on schema public to lector; grant select on public.funnel_events to lector;`). No expongas la tabla `leads` (contiene correos).
