/**
 * Prueba E2E del panel de administración contra un Supabase REAL (local o de pruebas).
 * NO la ejecutes contra producción: crea y borra productos de prueba.
 *
 * Requisitos:
 *   - Supabase con supabase/schema.sql aplicado y un usuario administrador.
 *   - La app construida y corriendo con esas variables (ver docs/PANEL-ADMIN.md → Pruebas).
 *
 * Uso:
 *   BASE_URL=http://localhost:3100 ADMIN_EMAIL=... ADMIN_PASSWORD=... \
 *   [INTRUDER_EMAIL=... INTRUDER_PASSWORD=...] PHOTOS_DIR=carpeta/con/fotos \
 *   node tests/e2e/admin.mjs
 *
 * PHOTOS_DIR debe contener: polera-blanco-{frontal,posterior,modelo}.jpg,
 * polera-azul-{frontal,posterior,modelo}.jpg, portada.jpg y no-es-foto.gif
 * (las fotos azules deben tener la prenda de color #202C40 al centro).
 */
import { createRequire } from "node:module";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = process.env.BASE_URL || "http://localhost:3100";
const DIR = process.env.PHOTOS_DIR;
const SHOTS = process.env.SHOTS_DIR || "";
const STEP = process.env.STEP || "all"; // "all" | "persist" (solo verificación después de reiniciar)
const f = (n) => path.join(DIR, n);
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) failures++;
};
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });

async function login(browser, email, password) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  [pageerror]", e.message));
  await page.goto(`${BASE}/admin/login`);
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForTimeout(2500);
  return { ctx, page };
}

/** Espera un aviso que contenga `text` (o un error) y devuelve su contenido. */
async function toast(page, text) {
  const okToast = page.locator("[data-toast=ok]").filter({ hasText: text });
  const err = page.locator("[data-toast=error]");
  await okToast.first().waitFor({ timeout: 30000 }).catch(() => {});
  if (await okToast.count()) return text;
  const e = (await err.allInnerTexts()).join(" | ");
  if (e) console.log("  [aviso de error]", e);
  return e;
}

/** URLs de las fotos visibles en la galería de la ficha (principal + miniaturas). */
async function galleryImages(page) {
  return page.evaluate(() => {
    const srcs = [...document.querySelectorAll("main img")].map((i) => {
      const u = new URL(i.currentSrc || i.src, location.href);
      return u.pathname.startsWith("/_next/image") ? decodeURIComponent(u.searchParams.get("url") || "") : u.href;
    });
    return [...new Set(srcs.filter((s) => s.includes("/storage/v1/object/public/media/")))];
  });
}

const browser = await chromium.launch();

if (STEP === "all") {
  /* 1. Seguridad: un usuario que NO está en ADMIN_EMAILS no entra */
  if (process.env.INTRUDER_EMAIL) {
    const { ctx, page } = await login(browser, process.env.INTRUDER_EMAIL, process.env.INTRUDER_PASSWORD);
    await page.goto(`${BASE}/admin/productos`);
    await page.waitForTimeout(1000);
    ok(page.url().includes("/admin/login"), "un usuario autenticado que no es administrador no puede entrar al panel");
    const csv = await ctx.request.get(`${BASE}/api/admin/leads`);
    ok(csv.status() === 401, `CSV de leads bloqueado para no administradores (${csv.status()})`);
    await ctx.close();
  }

  const { ctx, page } = await login(browser, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  ok(page.url().endsWith("/admin"), `el administrador entra al resumen del panel (${page.url()})`);

  /* 2. Migración del catálogo existente */
  const importBtn = page.getByRole("button", { name: "Importar catálogo inicial" });
  if (await importBtn.count()) {
    await importBtn.click();
    ok((await toast(page, "4 productos y 9 colores")) === "4 productos y 9 colores", "importa el catálogo original: 4 productos y 9 colores");
    await page.waitForTimeout(1500);
  }
  await page.reload();
  ok((await page.getByText("Productos publicados").locator("..").innerText()).includes("4"), "el resumen muestra 4 productos publicados");
  await shot(page, "admin-resumen");

  /* 3. Editar Polera Essential: colores, fotos, cuentagotas, precio y tallas */
  await page.goto(`${BASE}/admin/productos`);
  await shot(page, "admin-productos");
  await page.getByRole("link", { name: "Polera Essential" }).first().click();
  await page.waitForURL("**/admin/productos/polera-essential");
  await page.waitForTimeout(800);

  // Blanco (abierto por defecto)
  await page.getByLabel("Código HEX").fill("#FFFFFF");
  await page.getByRole("button", { name: "+ Agregar fotos" }).first().click();
  await page.locator("dialog[open] input[type=file]").setInputFiles([f("polera-blanco-frontal.jpg"), f("polera-blanco-posterior.jpg"), f("polera-blanco-modelo.jpg")]);
  ok((await toast(page, "3 fotos subidas")) === "3 fotos subidas", "sube 3 fotos a la vez (optimizadas) para Blanco");
  await page.waitForTimeout(800);
  ok((await page.getByRole("list", { name: /Fotos \(la primera/ }).locator("img").count()) === 3, "Blanco muestra 3 miniaturas");
  await page.getByRole("button", { name: "Usar foto 3 como principal" }).click();
  ok((await page.getByRole("list", { name: /Fotos \(la primera/ }).locator("li").first().innerText()).toLowerCase().includes("principal"), "se puede elegir la foto principal");

  // Azul marino
  await page.getByRole("button", { name: /Azul marino/ }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "+ Agregar fotos" }).first().click();
  await page.locator("dialog[open] input[type=file]").setInputFiles([f("polera-azul-frontal.jpg"), f("polera-azul-posterior.jpg"), f("polera-azul-modelo.jpg")]);
  ok((await toast(page, "3 fotos subidas")) === "3 fotos subidas", "sube 3 fotos para Azul marino");
  await page.waitForTimeout(800);
  // Cambiar el tono con el cuentagotas (clic en el centro de la prenda)
  await page.getByLabel("Código HEX").fill("#000000");
  await page.getByRole("button", { name: "Cuentagotas" }).click();
  const canvas = page.locator("dialog[open] canvas[role=img]");
  await canvas.waitFor();
  await page.waitForTimeout(1200);
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.55);
  await shot(page, "admin-cuentagotas");
  await page.getByRole("button", { name: "Usar este color" }).click();
  const hex = await page.getByLabel("Código HEX").inputValue();
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const dist = Math.hypot(rgb[0] - 32, rgb[1] - 44, rgb[2] - 64);
  ok(dist < 12, `el cuentagotas toma el color de la prenda (#202C40), no del fondo: ${hex}`);
  // Precio específico y tallas propias
  await page.getByPlaceholder("Usa el del producto").fill("21990");
  await page.getByRole("switch", { name: /Usar las tallas del producto/ }).click();
  for (const s of ["S", "XL", "XXL"]) await page.getByRole("group", { name: "Tallas de Azul marino" }).getByRole("button", { name: s, exact: true }).click();
  await shot(page, "admin-editor");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  ok((await toast(page, "Cambios guardados")) === "Cambios guardados", "guarda el producto con sus colores");
  await page.waitForTimeout(1500);

  /* 4. Biblioteca: validación de formato */
  await page.goto(`${BASE}/admin/imagenes`);
  await page.getByRole("button", { name: "+ Subir fotos" }).click().catch(() => {});
  await page.locator("input[type=file]").first().setInputFiles([f("no-es-foto.gif")]);
  await page.waitForTimeout(800);
  ok((await page.getByText(/formato no permitido/).count()) > 0, "rechaza archivos con formato no permitido (GIF)");
  ok((await page.locator("main ul img").count()) >= 6, "la biblioteca muestra las fotos subidas");
  await shot(page, "admin-biblioteca");
  // Subir y eliminar una foto: debe desaparecer también del almacenamiento
  const before = await page.getByRole("list", { name: "Fotos de la biblioteca" }).locator("img").count();
  await page.locator("input[type=file]").first().setInputFiles([f("portada.jpg")]);
  const up = await toast(page, "Foto subida.");
  if (up !== "Foto subida.") console.log("  [detalle]", await page.getByRole("list", { name: "Progreso de subida" }).innerText().catch(() => ""));
  ok(up === "Foto subida.", "sube una foto desde la biblioteca");
  await page.waitForTimeout(500);
  const newest = page.getByRole("list", { name: "Fotos de la biblioteca" }).locator("li").first();
  const url = await newest.locator("img").getAttribute("src");
  await newest.getByRole("button", { name: /Editar foto/ }).click();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await page.getByRole("button", { name: "Eliminar foto" }).click();
  ok((await toast(page, "Foto eliminada.")) === "Foto eliminada.", "elimina una foto tras confirmar");
  ok((await page.getByRole("list", { name: "Fotos de la biblioteca" }).locator("img").count()) === before, "la foto desaparece de la biblioteca");
  const gone = await ctx.request.get(url);
  ok(gone.status() >= 400, `el archivo se borra del almacenamiento (HTTP ${gone.status()})`);

  /* 5. Modelo con outfit (una foto, varias prendas) */
  await page.goto(`${BASE}/admin/modelos`);
  const card = page.locator("section").filter({ hasText: "Modelo 1" }).first();
  await card.getByRole("button", { name: "+ Agregar fotos" }).click();
  await page.getByRole("tab", { name: /Elegir de la biblioteca/ }).click();
  await page.locator("dialog[open] ul button").first().click();
  await page.getByRole("button", { name: "Agregar selección" }).click();
  await page.waitForTimeout(600);
  // La ficha se abre para asignar prendas
  const dlg = page.locator("dialog[open]");
  await dlg.getByLabel("Producto").selectOption("polera-essential");
  await dlg.getByLabel("Color").selectOption({ label: "Blanco" });
  await dlg.getByRole("button", { name: "Agregar prenda" }).click();
  await dlg.getByLabel("Producto").selectOption("chino-everyday");
  await dlg.getByLabel("Color").selectOption({ label: "Beige" });
  await dlg.getByRole("button", { name: "Agregar prenda" }).click();
  await dlg.getByRole("button", { name: "Guardar", exact: true }).click();
  ok((await toast(page, "Foto actualizada")) === "Foto actualizada", "asigna 2 prendas (producto + color) a una foto de outfit");
  await card.getByRole("button", { name: "Guardar cambios" }).click();
  ok((await toast(page, "guardado")) === "guardado", "guarda el modelo con su galería");
  await page.waitForTimeout(1200);
  const assoc = await page.locator("section").filter({ hasText: "Modelo 1" }).first().innerText();
  ok(assoc.includes("Polera Essential") && assoc.includes("Chino Everyday"), "el modelo muestra sus productos y colores asociados");
  await shot(page, "admin-modelos");

  /* 6. Imagen de portada del inicio */
  await page.goto(`${BASE}/admin/inicio`);
  const hero = page.locator("section").filter({ hasText: "Imagen principal de portada" }).first();
  await hero.getByRole("button", { name: "Elegir foto" }).click();
  await page.locator("dialog[open] input[type=file]").setInputFiles([f("portada.jpg")]);
  await page.waitForTimeout(2500);
  await hero.getByRole("button", { name: "Guardar" }).click();
  ok((await toast(page, "Ya se ve en la tienda")) === "Ya se ve en la tienda", "cambia la imagen de portada sin tocar código");
  await shot(page, "admin-inicio");

  /* 7. Borrador → vista previa → publicar */
  await page.goto(`${BASE}/admin/productos`);
  await page.getByRole("button", { name: "+ Nuevo producto" }).click();
  await page.getByLabel("Nombre").fill("Sweater Prueba E2E");
  await page.getByLabel("Categoría").selectOption("sweaters");
  await page.getByRole("button", { name: "Crear y continuar" }).click();
  await page.waitForURL("**/admin/productos/sweater-prueba-e2e");
  const pub = await ctx.newPage();
  await pub.goto(`${BASE}/producto/sweater-prueba-e2e`);
  await pub.waitForTimeout(1200);
  ok((await pub.getByText("No encontramos esta página").count()) === 1 && (await pub.getByText("Sweater Prueba E2E").count()) === 0, "un borrador no se ve en la tienda");
  await pub.close();
  await page.getByLabel("Precio (CLP)").fill("49990");
  await page.getByRole("button", { name: "+ Agregar color" }).first().click();
  await page.getByLabel("Nombre comercial del color").fill("Verde oliva");
  await page.getByLabel("Código HEX").fill("#5B5E3A");
  await page.getByRole("button", { name: "Guardar y publicar" }).click();
  ok((await toast(page, "Publicado")) === "Publicado", "publica el producto nuevo");
  await page.waitForTimeout(1500);
  const pub2 = await ctx.newPage();
  await pub2.goto(`${BASE}/producto/sweater-prueba-e2e`);
  await pub2.waitForTimeout(800);
  ok((await pub2.getByRole("heading", { name: "Sweater Prueba E2E" }).count()) === 1 && (await pub2.getByText("$49.990").count()) > 0, "tras publicar, el producto aparece en la tienda sin redeploy");
  await pub2.close();
  const prev = await ctx.newPage();
  await prev.goto(`${BASE}/admin/vista-previa/sweater-prueba-e2e`);
  ok((await prev.getByText("Vista previa").count()) > 0 && (await prev.getByText("Sweater Prueba E2E").count()) > 0, "la vista previa muestra el producto");
  await prev.close();

  /* 8. Duplicar, despublicar y eliminar con confirmación */
  await page.goto(`${BASE}/admin/productos`);
  const row = page.locator("li").filter({ hasText: "Sweater Prueba E2E" }).first();
  await row.getByRole("button", { name: "Duplicar" }).click();
  await page.waitForURL("**/admin/productos/sweater-prueba-e2e-copia");
  ok(true, "duplica un producto (queda como borrador)");
  await page.goto(`${BASE}/admin/productos`);
  for (const name of ["Sweater Prueba E2E (copia)", "Sweater Prueba E2E"]) {
    await page.locator("li").filter({ hasText: name }).first().getByRole("button", { name: "Eliminar" }).click();
    await page.getByRole("button", { name: "Eliminar producto" }).click();
    await page.waitForTimeout(1200);
  }
  ok((await page.getByText("Sweater Prueba E2E").count()) === 0, "elimina productos tras confirmar");
  await ctx.close();
}

/* 9. Tienda: cada color muestra SOLO sus fotos, precio y tallas propios */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.route(/googletagmanager|facebook|clarity\.ms/, (r) => r.abort());
  await page.goto(`${BASE}/producto/polera-essential?color=blanco`);
  await page.getByRole("button", { name: "Aceptar todo" }).click();
  await page.waitForTimeout(1200);
  const white = await galleryImages(page);
  ok(white.length === 3, `Blanco muestra sus 3 fotos (${white.length})`);
  ok((await page.locator("main").innerText()).includes("$19.990"), "Blanco usa el precio del producto ($19.990)");
  const whiteSizes = await page.getByRole("radiogroup", { name: "Talla" }).getByRole("radio").allInnerTexts();
  await page.getByRole("radiogroup", { name: "Color" }).getByRole("radio", { name: "Azul marino" }).click();
  await page.waitForTimeout(800);
  const navy = await galleryImages(page);
  ok(navy.length === 3 && navy.every((u) => !white.includes(u)), "al elegir Azul marino cambian TODAS las fotos y ninguna es de Blanco");
  ok(page.url().includes("color=azul-marino"), "la URL refleja el color sin salir de la página");
  ok((await page.getByText("Color: Azul marino").count()) === 1, "muestra el nombre del color elegido");
  ok((await page.locator("main").innerText()).includes("$21.990"), "Azul marino muestra su precio específico ($21.990)");
  const navySizes = await page.getByRole("radiogroup", { name: "Talla" }).getByRole("radio").allInnerTexts();
  ok(whiteSizes.join() === "S,M,L,XL,XXL" && navySizes.join() === "M,L", `tallas por color (Blanco ${whiteSizes.join()} · Azul ${navySizes.join()})`);
  // Teclado: flecha izquierda vuelve a Blanco
  await page.getByRole("radiogroup", { name: "Color" }).getByRole("radio", { name: "Azul marino" }).focus();
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(400);
  ok((await page.getByText("Color: Blanco").count()) === 1, "los círculos de color se manejan con el teclado (flechas)");
  const whiteSwatch = page.getByRole("radiogroup", { name: "Color" }).getByRole("radio", { name: "Blanco" }).locator("span");
  ok((await whiteSwatch.getAttribute("class")).includes("border-ink"), "el círculo blanco tiene borde visible");
  await page.keyboard.press("ArrowRight");
  await page.getByRole("radiogroup", { name: "Talla" }).getByRole("radio", { name: "M" }).click();
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await page.waitForTimeout(500);
  await shot(page, "tienda-producto-azul");
  const ga = await page.evaluate(() => (window.dataLayer || []).map((a) => Array.from(a)).filter((a) => a[0] === "event").map((a) => ({ name: a[1], p: a[2] })));
  const sel = ga.filter((e) => e.name === "select_color");
  ok(sel.length === 3 && sel[0].p.color_name === "Azul marino" && sel[0].p.variant_id === "POLERA-ESSENTIAL-AZUL-MARINO" && sel[0].p.product_id === "polera-essential", "select_color con product_id, product_name, variant_id y color_name (uno por cada cambio de color: 3)");
  const view = ga.find((e) => e.name === "view_item");
  ok(view?.p.items[0].item_variant === "Blanco", "view_item incluye el color mostrado en item_variant");
  const add = ga.find((e) => e.name === "add_to_cart");
  ok(add?.p.items[0].item_variant === "Azul marino" && add.p.items[0].item_variant_id === "POLERA-ESSENTIAL-AZUL-MARINO" && add.p.items[0].price === 21990, "add_to_cart registra la variante, su SKU y su precio");
  ok(ga.filter((e) => e.name === "view_item").length === 1, "cambiar de color no duplica view_item");

  // Carrito y checkout con la variante
  await page.goto(`${BASE}/carrito`);
  await page.waitForTimeout(800);
  ok((await page.locator("main").innerText()).includes("Azul marino · Talla M"), "el carrito guarda el color y la talla");
  const cartImg = await galleryImages(page);
  ok(cartImg.length === 1 && navy.includes(cartImg[0]), "el carrito muestra la foto del color elegido");

  // Catálogo: círculos en las tarjetas
  await page.goto(`${BASE}/catalogo`);
  await page.waitForTimeout(800);
  const cardImgs = async () => page.evaluate(() => {
    const a = document.querySelector('article a[href^="/producto/polera-essential"] img');
    return a ? decodeURIComponent(new URL(a.currentSrc || a.src).searchParams.get("url") || a.src) : "";
  });
  const before = await cardImgs();
  await page.getByRole("radiogroup", { name: "Colores de Polera Essential" }).getByRole("radio", { name: "Azul marino" }).click();
  await page.waitForTimeout(500);
  const after = await cardImgs();
  ok(white.includes(before) && navy.includes(after), "en el catálogo el círculo de color cambia la foto de la tarjeta");
  await shot(page, "tienda-catalogo");

  // Inicio con la portada nueva
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(800);
  ok((await galleryImages(page)).length > 0, "el inicio muestra la portada cargada desde el panel");
  await shot(page, "tienda-inicio");
  await ctx.close();
}

await browser.close();
console.log(failures ? `\n${failures} verificación(es) fallaron` : "\nTodo OK");
process.exit(failures ? 1 : 0);
