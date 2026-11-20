# FRMA — Tienda de prelanzamiento (smoke test de demanda)

**FRMA** es una marca provisional de vestuario masculino minimalista para Chile. Este proyecto es una tienda online **funcional pero sin ventas**: sirve para medir cuántas personas, desde un anuncio de Instagram, ven productos, los agregan al carrito y llegan a querer comprar. **No cobra, no genera pedidos y no pide datos de pago.** Al final del checkout el visitante ve una pantalla que explica que FRMA aún no recibe pedidos y puede, si quiere, dejar su correo.

> Mensaje principal: **"Tu ropero, resuelto"**.

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
| Panel | `/admin/experiment` | Métricas reales del embudo y exportación de leads (requiere inicio de sesión) |

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

**No necesitas tocar componentes.** Todo está en `src/config/`:

| Archivo | Qué cambias ahí |
|---|---|
| `src/config/pricing.ts` | **Precios** (en CLP, sin puntos) y la bandera `PRICES_VALIDATED` |
| `src/config/catalog.ts` | Productos, colores, tallas, descripciones, materiales, fotos y composición de FRMA 01 |
| `src/config/home.ts` | Textos e imagen del inicio |
| `src/config/site.ts` | Correo de contacto, barra superior, textos de despacho, texto de consentimiento |
| `src/config/experiments.ts` | Pruebas A/B (desactivadas) |

### Precios (importante antes de pagar anuncios)

Los precios actuales son **hipótesis** no validadas con proveedores:

| Producto | Precio provisional |
|---|---|
| Polera Essential | $19.990 |
| Chino Everyday | $39.990 |
| Polo Classic | $29.990 |
| Camisa Oxford | $34.990 |
| FRMA 01 (7 piezas) | $179.990 (por separado: $204.930) |

Cuando los confirmes, edita `PRICES` en `src/config/pricing.ts` y cambia `PRICES_VALIDATED = true`. El panel muestra una advertencia mientras sea `false`.

### Fotos

1. Copia tus imágenes (JPG/WebP, idealmente 1600×2000 px, formato vertical 4:5) a `public/images/productos/`.
2. En `src/config/catalog.ts`, dentro del color correspondiente, agrega:
   ```ts
   images: [
     { src: "/images/productos/polera-blanco-1.jpg", alt: "Polera Essential blanca, vista frontal", conceptual: true },
   ],
   ```
3. `conceptual: true` muestra la etiqueta **"Imagen conceptual"** (úsalo para imágenes generadas con IA o renders).
4. Si un color no tiene fotos se muestra una ilustración neutra rotulada "Ilustración · fotografía próximamente".

Para la cápsula usa `CAPSULE.heroImage` y para el inicio `HOME.hero.image`. **Nunca uses fotos de productos de otras marcas.**

---

## 4. Conectar las cuentas

La guía detallada, con cada clic, está en **[docs/GUIA-INTEGRACIONES.md](docs/GUIA-INTEGRACIONES.md)**. Resumen:

| Servicio | Variable(s) | Para qué |
|---|---|---|
| Google Analytics 4 | `NEXT_PUBLIC_GA4_ID` | Embudo, campañas, Looker Studio |
| Meta Pixel | `NEXT_PUBLIC_META_PIXEL_ID` | Optimizar y medir anuncios de Instagram |
| Microsoft Clarity | `NEXT_PUBLIC_CLARITY_ID` | Mapas de calor y grabaciones |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Leads, medición propia y login del panel |
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

## 6. Panel del experimento y leads

`/admin/experiment` muestra datos **reales** (nunca simulados) desde Supabase:

- Visitantes únicos y sesiones
- Embudo: visitas → vieron producto → carrito → checkout → intención final → correo, con tasas entre etapas
- Desglose por fuente/campaña (UTM), por producto y cápsula, y por variante A/B
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

Pruebas unitarias (Vitest): catálogo y cápsula, carrito, precios por experimento, parámetros GA4, mapeo a Meta (nunca `Purchase`), UTM, validación de leads, métricas y CSV.

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

Checklist manual: **[docs/QA-CHECKLIST.md](docs/QA-CHECKLIST.md)**.

---

## 10. Arquitectura

```
src/
  config/            ← TODO lo editable (catálogo, precios, textos, experimentos)
  app/               ← páginas (App Router) y API
    api/leads        ← POST registro de interés → Supabase
    api/events       ← POST medición propia (solo con consentimiento)
    api/admin/leads  ← GET CSV (solo administradores)
    admin/           ← login + panel
  components/        ← UI reutilizable (tarjetas, visuales, formulario, banner…)
  lib/
    analytics/       ← consentimiento, atribución, eventos GA4/Meta, carga de scripts
    cart/            ← lógica del carrito (localStorage)
    experiments.ts   ← asignación de variantes
    metrics.ts       ← cálculo del embudo para el panel
    leads/validate.ts← validación + anti-spam
  proxy.ts           ← renueva la sesión del panel (/admin)
supabase/schema.sql  ← tablas leads y funnel_events (con RLS)
tests/               ← unitarios + e2e
```

Flujo de un evento: componente → `track()` → si hay consentimiento: GA4 (`gtag`), Meta (`fbq`, solo eventos mapeados), Clarity (`clarity("event")`) y `/api/events` (Supabase). Sin decisión de cookies, los eventos esperan en memoria y solo se envían si el visitante acepta.

---

## 11. Documentos adicionales

- **[docs/GUIA-INTEGRACIONES.md](docs/GUIA-INTEGRACIONES.md)**: crear cuentas, obtener IDs, configurar eventos y conversiones, verificar, Looker Studio.
- **[docs/QA-CHECKLIST.md](docs/QA-CHECKLIST.md)**: checklist antes de lanzar.
- **[docs/PENDIENTES-LANZAMIENTO.md](docs/PENDIENTES-LANZAMIENTO.md)**: lo que debes confirmar antes de invertir en campañas (incluye revisión legal).
