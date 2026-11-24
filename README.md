# FRMA — Tienda de prelanzamiento (smoke test de demanda)

**FRMA** es una marca provisional de vestuario masculino minimalista para Chile. Este proyecto es una tienda online **funcional pero sin ventas**: sirve para medir cuántas personas, desde un anuncio de Instagram, ven productos, los agregan al carrito y llegan a querer comprar. **No cobra, no genera pedidos y no pide datos de pago.** Al final del checkout el visitante ve una pantalla que explica que FRMA aún no recibe pedidos y puede, si quiere, dejar su correo.

> Mensaje principal: **"Tu ropero, resuelto"**.

> **Novedad (v2): panel de administración en `/admin`.** Productos, colores, fotos, modelos, guardarropas e imágenes del inicio se gestionan sin tocar código y sin volver a desplegar. Guía completa: **[docs/PANEL-ADMIN.md](docs/PANEL-ADMIN.md)**.

---

## Índice

1. [Qué incluye](#1-qué-incluye)
2. [Probarlo en tu computador](#2-probarlo-en-tu-computador)
3. [Editar productos, precios y fotos](#3-editar-productos-precios-y-fotos)
4. [Conectar las cuentas (GA4, Meta, Clarity, Supabase)](#4-conectar-las-cuentas)
5. [Publicar en Vercel](#5-publicar-en-vercel)
6. [Panel del experimento y leads](#6-panel-del-experimento-y-leads)
7. [Experimentos A/B](#7-experimentos-ab)
8. [Enlaces de anuncios (UTM) y tráfico interno](#8-enlaces-de-anuncios-utm-y-tráfico-interno)
9. [Tests y verificación](#9-tests-y-verificación)
10. [Arquitectura](#10-arquitectura)
11. [Documentos adicionales](#11-documentos-adicionales)

---

## 1. Qué incluye

| Página | Ruta | Qué hace |
|---|---|---|
| Inicio | `/` | Hero editorial, propuesta de valor, cápsula destacada, categorías, prendas, beneficios y registro |
| Catálogo | `/catalogo` | Filtros por categoría, color y precio (se pueden compartir por URL, p. ej. `/catalogo?categoria=poleras`) |
| Producto | `/producto/polera-essential` | Galería, colores, tallas, cantidad, detalles "pendientes de verificar", agregar al carrito |
| FRMA 01 | `/frma-01` | Las 7 piezas, 10 combinaciones, precio por separado vs. precio cápsula, tallas y CTA |
| Carrito | `/carrito` | Agregar, eliminar, cambiar cantidades, subtotal (se guarda en el navegador) |
| Checkout | `/checkout` | Resumen, despacho "Por confirmar", botón **Continuar con mi pedido** |
| Prelanzamiento | `/prelanzamiento` | Explica que FRMA aún no recibe pedidos ni pagos + registro voluntario |
| Privacidad / Contacto | `/privacidad`, `/contacto` | Textos base (pendientes de revisión legal) |
| Panel de administración | `/admin` | Productos, colores, fotos, modelos, guardarropas e imágenes del inicio (requiere inicio de sesión) |
| Resultados | `/admin/experiment` | Métricas reales del embudo, preferencia por color y exportación de leads |

Además: banner de cookies (nada de analítica/publicidad se activa sin permiso), GA4 + Meta Pixel + Clarity, atribución UTM, registro de leads en Supabase con anti-spam, estructura de pruebas A/B desactivada.

**Tecnología:** Next.js 16 + TypeScript + Tailwind CSS 4, Supabase (solo leads, eventos propios y login del panel), despliegue en Vercel.

---

## 2. Probarlo en tu computador

Necesitas instalar **Node.js 20 o superior** (https://nodejs.org → versión "LTS").

```bash
cd frma
```

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Abre http://localhost:3000. El sitio funciona aunque `.env.local` esté vacío: simplemente no habrá analítica ni registro de leads (el formulario dirá que el registro aún no está habilitado).

> En `localhost` todo el tráfico se marca automáticamente como **interno** (`traffic_type=internal`) para no ensuciar tus datos reales.

---

## 3. Editar productos, precios y fotos

**Desde la versión 2 se hace en el panel `/admin`**, sin código: crear, editar, duplicar, publicar y ordenar productos; colores con selector, cuentagotas, SKU, tallas, precio y fotos propias; biblioteca de imágenes; modelos; guardarropas; imágenes del inicio. Paso a paso en **[docs/PANEL-ADMIN.md](docs/PANEL-ADMIN.md)**.

Primera vez: ejecuta `supabase/schema.sql`, crea tu usuario administrador, entra a `/admin` y presiona **Importar catálogo inicial** (copia los 4 productos, 9 colores, FRMA 01 y 3 modelos actuales a la base de datos).

Lo que sigue en archivos de configuración:

| Archivo | Qué contiene |
|---|---|
| `src/config/catalog.ts` | Catálogo **inicial** (se usa para importar y como respaldo si Supabase no está configurado), categorías y grupos de tallas del panel |
| `src/config/pricing.ts` | Precios del catálogo inicial y la bandera `PRICES_VALIDATED` |
| `src/config/home.ts` | Textos del inicio (las imágenes se cambian en el panel) |
| `src/config/site.ts` | Correo de contacto, barra superior, textos de despacho, texto de consentimiento |
| `src/config/experiments.ts` | Pruebas A/B (desactivadas). Los precios de prueba usan el id del producto o guardarropa |

### Precios (importante antes de pagar anuncios)

Los precios actuales son **hipótesis** no validadas con proveedores:

| Producto | Precio provisional |
|---|---|
| Polera Essential | $19.990 |
| Chino Everyday | $39.990 |
| Polo Classic | $29.990 |
| Camisa Oxford | $34.990 |
| FRMA 01 (7 piezas) | $179.990 (por separado: $204.930) |

Cámbialos en el panel (producto, color o guardarropa). Cuando estén validados, cambia `PRICES_VALIDATED = true` en `src/config/pricing.ts` para quitar la advertencia del panel de resultados.

### Fotos

Se suben en el panel (arrastrar y soltar, varias a la vez) y se optimizan automáticamente. Cada color tiene su propia galería y la tienda muestra **solo** las fotos del color elegido. Marca como **IA** las imágenes generadas con inteligencia artificial: la tienda las rotula "Imagen conceptual". **Nunca uses fotos de productos de otras marcas.**

---

## 4. Conectar las cuentas

La guía detallada, con cada clic, está en **[docs/GUIA-INTEGRACIONES.md](docs/GUIA-INTEGRACIONES.md)**. Resumen:

| Servicio | Variable(s) | Para qué |
|---|---|---|
| Google Analytics 4 | `NEXT_PUBLIC_GA4_ID` | Embudo, campañas, Looker Studio |
| Meta Pixel | `NEXT_PUBLIC_META_PIXEL_ID` | Optimizar y medir anuncios de Instagram |
| Microsoft Clarity | `NEXT_PUBLIC_CLARITY_ID` | Mapas de calor y grabaciones |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Catálogo, fotos (Storage), leads, medición propia y login del panel |
| Panel | `ADMIN_EMAILS` | Correos autorizados en `/admin` |

Si una variable falta o tiene un formato inválido, esa integración simplemente no se carga y el sitio sigue funcionando.

---

## 5. Publicar en Vercel

1. Sube este proyecto a un repositorio de GitHub (privado está bien).
2. Entra a https://vercel.com, crea una cuenta con tu GitHub → **Add New… → Project** → elige el repositorio → **Import**.
3. Antes de **Deploy**, abre **Environment Variables** y pega las variables de `.env.example` con tus valores (al menos `NEXT_PUBLIC_SITE_URL`).
4. **Deploy**. En 1–2 minutos tendrás una URL `https://xxx.vercel.app`.
5. Dominio propio (opcional): **Settings → Domains** → agrega `tudominio.cl` y sigue las instrucciones de DNS de tu proveedor (NIC Chile u otro). Luego actualiza `NEXT_PUBLIC_SITE_URL` y haz **Redeploy**.

> Cada vez que cambies una variable `NEXT_PUBLIC_…` en Vercel debes hacer **Deployments → ⋯ → Redeploy**.
> Las URLs de *preview* de Vercel se marcan como tráfico interno automáticamente.

---

## 6. Resultados del experimento y leads

`/admin/experiment` muestra datos **reales** (nunca simulados) desde Supabase:

- Visitantes únicos y sesiones
- Embudo: visitas → vieron producto → carrito → checkout → intención final → correo, con tasas entre etapas
- Desglose por fuente/campaña (UTM), por producto y cápsula, **por color** y por variante A/B
- Filtro **Real / Interno / Todo** y periodo (7, 30, 90 días, todo)
- Botón **Descargar CSV** de leads

El acceso usa **Supabase Auth** (correo + contraseña) y además exige que tu correo esté en `ADMIN_EMAILS`. Para crear tu usuario sigue el paso "Supabase → Usuario administrador" de la guía.

> La medición propia solo cuenta visitantes que **aceptaron cookies de analítica**. Los leads se cuentan siempre (los dejaron con consentimiento explícito). GA4 dará números distintos (bloqueadores, modelado, etc.): para el análisis de campañas en GA4 usa el dashboard de Looker Studio descrito en la guía.

---

## 7. Experimentos A/B

En `src/config/experiments.ts` hay dos ejemplos **desactivados**: precio de FRMA 01 ($179.990 vs $159.990) y mensaje del hero. Para activar uno:

1. Pon `enabled: true` en **un** experimento (y ajusta variantes/pesos).
2. Despliega.

Cada visitante recibe una variante al azar que se guarda en su navegador, así que **no verá precios distintos mientras navega** (ni al volver). Todos los eventos llevan `experiment_id` y `variant_id`, y el panel muestra intención de compra por variante. Si cambias un experimento ya iniciado, cámbiale también el `id` (p. ej. `precio-frma01-v2`).

---

## 8. Enlaces de anuncios (UTM) y tráfico interno

Usa siempre UTM en tus anuncios. En Meta Ads → anuncio → **Parámetros de URL**:

```
utm_source=instagram&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}
```

El sitio guarda la primera y la última campaña (y el `fbclid`) en el navegador del visitante y los asocia a eventos y leads. No se guardan nombres ni correos en la analítica.

**Marcar tu propio navegador como interno:** visita una vez `https://tudominio.cl/?frma_internal=1` (para desmarcar: `?frma_internal=0`). Hazlo en cada navegador/teléfono del equipo.

---

## 9. Tests y verificación

```bash
npm test
```

Pruebas unitarias (Vitest): catálogo inicial y migración, variantes de color, carrito por color/talla, precios por color y por experimento, parámetros GA4 (`select_color`, `item_variant`), mapeo a Meta (nunca `Purchase`), UTM, validación de leads y del panel (productos, HEX, SKU, fotos, enlaces), métricas (incluida preferencia por color) y CSV.

```bash
npm run lint
```

```bash
npm run build
```

Prueba de extremo a extremo (Playwright, con IDs de prueba falsos y bloqueando las peticiones reales a Google/Meta/Clarity):

```bash
NEXT_PUBLIC_GA4_ID=G-TEST123456 NEXT_PUBLIC_META_PIXEL_ID=1234567890123 NEXT_PUBLIC_CLARITY_ID=testclar01 npm run build
```

```bash
npm run start -- -p 3100
```

```bash
BASE_URL=http://localhost:3100 npm run test:e2e
```

Verifica: nada se carga antes del consentimiento, rechazar bloquea todo, embudo completo con eventos y parámetros correctos, Meta sin `Purchase`, ningún correo en eventos, sin scroll horizontal en móvil, panel y CSV protegidos. (Requiere `npm i -D playwright && npx playwright install chromium` en tu computador.)

Prueba de extremo a extremo del **panel** (contra un Supabase de pruebas, nunca producción): ver [docs/PANEL-ADMIN.md §10](docs/PANEL-ADMIN.md#10-pruebas-automáticas-del-panel-para-quien-mantenga-el-código).

Checklist manual: **[docs/QA-CHECKLIST.md](docs/QA-CHECKLIST.md)**.

---

## 10. Arquitectura

```
src/
  config/            ← catálogo inicial, precios iniciales, textos, experimentos
  app/               ← páginas (App Router) y API
    admin/(panel)/   ← panel: productos, modelos, imágenes, guardarropas, inicio, resultados
    admin/actions.ts ← acciones del panel (verifican administrador en cada llamada)
    api/leads        ← POST registro de interés → Supabase
    api/events       ← POST medición propia (solo con consentimiento)
    api/admin/leads  ← GET CSV (solo administradores)
  components/        ← UI de la tienda (tarjetas, círculos de color…) y del panel (components/admin)
  lib/
    catalog/         ← catálogo desde Supabase con caché (se renueva al guardar en el panel)
    admin/           ← validaciones, datos del panel, subida y optimización de fotos
    analytics/       ← consentimiento, atribución, eventos GA4/Meta, carga de scripts
    cart/            ← carrito por producto + color + talla (localStorage)
    experiments.ts   ← asignación de variantes
    metrics.ts       ← cálculo del embudo para el panel de resultados
  proxy.ts           ← renueva la sesión del panel (/admin)
supabase/schema.sql  ← tablas (leads, eventos, catálogo, fotos, modelos…), bucket de fotos y permisos
tests/               ← unitarios + e2e (tienda y panel)
```

**Cómo se actualiza la tienda sin redeploy:** el catálogo se lee de Supabase y se guarda en caché; cada vez que guardas en el panel, el servidor invalida esa caché (`updateTag`) y la siguiente visita ve los cambios. Como respaldo, la caché se renueva cada 5 minutos.

Flujo de un evento: componente → `track()` → si hay consentimiento: GA4 (`gtag`), Meta (`fbq`, solo eventos mapeados), Clarity (`clarity("event")`) y `/api/events` (Supabase). Sin decisión de cookies, los eventos esperan en memoria y solo se envían si el visitante acepta.

---

## 11. Documentos adicionales

- **[docs/PANEL-ADMIN.md](docs/PANEL-ADMIN.md)**: cómo usar el panel de administración.
- **[docs/GUIA-INTEGRACIONES.md](docs/GUIA-INTEGRACIONES.md)**: crear cuentas, obtener IDs, configurar eventos y conversiones, verificar, Looker Studio.
- **[docs/QA-CHECKLIST.md](docs/QA-CHECKLIST.md)**: checklist antes de lanzar.
- **[docs/PENDIENTES-LANZAMIENTO.md](docs/PENDIENTES-LANZAMIENTO.md)**: lo que debes confirmar antes de invertir en campañas (incluye revisión legal).
