/**
 * Prueba de humo E2E (Playwright). Verifica consentimiento, eventos y embudo.
 *
 * Uso:
 *   1. Construir con IDs de PRUEBA (no reales):
 *        NEXT_PUBLIC_GA4_ID=G-TEST123456 NEXT_PUBLIC_META_PIXEL_ID=1234567890123 \
 *        NEXT_PUBLIC_CLARITY_ID=testclar01 npm run build
 *   2. npm run start -- -p 3100
 *   3. BASE_URL=http://localhost:3100 node tests/e2e/smoke.mjs
 *
 * Las peticiones a Google/Meta/Clarity se interceptan y bloquean: no se envía nada real.
 */
import { createRequire } from "node:module";

// Requiere Playwright instalado (npm i -D playwright && npx playwright install chromium).
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL || "http://localhost:3100";
const SHOTS = process.env.SHOTS_DIR || "";
const VENDORS = /googletagmanager|google-analytics|facebook\.net|facebook\.com\/tr|clarity\.ms/;
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) failures++;
};

async function newPage(browser, opts = {}) {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], ...opts });
  const page = await ctx.newPage();
  const vendorRequests = [];
  await page.route(VENDORS, (route) => {
    vendorRequests.push(route.request().url());
    route.abort();
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return { ctx, page, vendorRequests, errors };
}

const eventNames = (page) => page.evaluate(() => (window.frmaEventLog || []).map((e) => `${e.name}:${e.sent.join("+") || "-"}`));
const gaEvents = (page) =>
  page.evaluate(() =>
    (window.dataLayer || []).map((a) => Array.from(a)).filter((a) => a[0] === "event").map((a) => ({ name: a[1], params: a[2] })),
  );
const metaCalls = (page) => page.evaluate(() => (window.fbq?.queue || []).map((a) => Array.from(a)).filter((a) => a[0] === "track" || a[0] === "trackCustom").map((a) => a[1]));

const browser = await chromium.launch();

/* 1. Sin consentimiento: nada de terceros */
{
  const { ctx, page, vendorRequests, errors } = await newPage(browser);
  await page.goto(`${BASE}/producto/polera-essential?utm_source=instagram&utm_medium=paid_social&utm_campaign=test_frma&fbclid=TESTFBCLID`);
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(800);
  ok(vendorRequests.length === 0, "antes del consentimiento no se carga GA4/Meta/Clarity");
  ok(!(await page.evaluate(() => typeof window.gtag === "function" || typeof window.fbq === "function")), "gtag/fbq no existen antes del consentimiento");
  await page.getByRole("button", { name: "Rechazar" }).click();
  await page.getByRole("radio", { name: "M", exact: true }).click();
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await page.waitForTimeout(500);
  ok(vendorRequests.length === 0, "tras rechazar, sigue sin cargarse ningún script de terceros");
  const firstParty = await page.evaluate(() => (window.frmaEventLog || []).some((e) => e.sent.length > 0));
  ok(!firstParty, "tras rechazar, ningún evento se envía a ningún destino");
  const attr = await page.evaluate(() => JSON.parse(localStorage.getItem("frma_attr_first") || "{}"));
  ok(attr.utm_source === "instagram" && attr.fbclid === "TESTFBCLID", "UTM y fbclid quedan guardados localmente para atribución");
  ok(errors.length === 0, `sin errores JS (${errors.join(" | ")})`);
  await ctx.close();
}

/* 2. Embudo completo con consentimiento */
{
  const { ctx, page, vendorRequests, errors } = await newPage(browser);
  await page.goto(`${BASE}/?utm_source=instagram&utm_medium=paid_social&utm_campaign=test_frma&utm_content=reel_a&fbclid=TESTFBCLID`);
  await page.getByRole("button", { name: "Aceptar todo" }).click();
  await page.waitForTimeout(600);
  ok(vendorRequests.some((u) => u.includes("googletagmanager")), "GA4 se carga tras aceptar");
  ok(vendorRequests.some((u) => u.includes("facebook.net")), "Meta Pixel se carga tras aceptar");
  ok(vendorRequests.some((u) => u.includes("clarity.ms")), "Clarity se carga tras aceptar");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/m-home.png`, fullPage: true });

  await page.getByRole("link", { name: "Ver FRMA 01" }).first().click();
  await page.waitForURL("**/frma-01");
  await page.waitForTimeout(400);
  await page.getByRole("radiogroup", { name: /Talla superior/ }).getByRole("radio", { name: "M" }).click();
  await page.getByRole("radiogroup", { name: /Talla de pantalón/ }).getByRole("radio", { name: "42" }).click();
  await page.getByRole("button", { name: /Agregar FRMA 01/ }).click();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/m-capsula.png`, fullPage: true });

  await page.getByRole("contentinfo").getByRole("link", { name: "Catálogo" }).click(); // navegación interna (sin recargar)
  await page.waitForURL("**/catalogo");
  await page.waitForTimeout(400);
  await page.getByRole("link", { name: "Chino Everyday" }).first().click();
  await page.waitForURL("**/producto/chino-everyday**");
  await page.waitForTimeout(400);
  await page.getByRole("radio", { name: "42" }).click();
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/m-producto.png`, fullPage: true });

  await page.getByRole("link", { name: "Ver carrito" }).click();
  await page.waitForURL("**/carrito");
  await page.waitForTimeout(400);
  await page.getByRole("group", { name: "Cantidad de Chino Everyday" }).getByRole("button", { name: "Aumentar cantidad" }).click();
  await page.waitForTimeout(100);
  const sub1 = await page.getByText("Subtotal").locator("..").innerText();
  ok(sub1.includes("259.970"), `subtotal correcto con 2 chinos + cápsula (${sub1.replace(/\s+/g, " ")})`);
  await page.getByRole("group", { name: "Cantidad de Chino Everyday" }).getByRole("button", { name: "Disminuir cantidad" }).click();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/m-carrito.png`, fullPage: true });
  await page.getByRole("link", { name: "Ir al checkout" }).click();
  await page.waitForURL("**/checkout");
  await page.waitForTimeout(400);
  ok((await page.getByText("Por confirmar").count()) > 0, "checkout muestra despacho 'Por confirmar'");
  ok((await page.locator("input[name*=card], input[autocomplete^=cc-]").count()) === 0, "checkout no pide datos de tarjeta");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/m-checkout.png`, fullPage: true });
  await page.getByRole("button", { name: "Continuar con mi pedido" }).click();
  await page.waitForURL("**/prelanzamiento**");
  await page.waitForTimeout(400);
  ok((await page.getByText("FRMA todavía no recibe pedidos ni pagos.").count()) === 1, "pantalla de prelanzamiento lo informa claramente");

  // Formulario: validaciones
  await page.getByRole("button", { name: "Avísenme del lanzamiento" }).click();
  ok((await page.getByRole("alert").first().innerText()).includes("correo válido"), "valida email");
  await page.getByLabel("Correo electrónico").fill("prueba@ejemplo.cl");
  await page.getByRole("button", { name: "Avísenme del lanzamiento" }).click();
  ok((await page.getByRole("alert").first().innerText()).includes("autorización"), "exige consentimiento explícito");
  await page.waitForTimeout(1600);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Avísenme del lanzamiento" }).click();
  await page.waitForTimeout(800);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/m-prelanzamiento.png`, fullPage: true });

  const names = await eventNames(page);
  const ga = await gaEvents(page);
  const meta = await metaCalls(page);
  console.log("  eventos:", names.join(", "));
  console.log("  Meta:", meta.join(", "));
  for (const n of ["page_view", "view_item_list", "select_item", "view_item", "add_to_cart", "remove_from_cart", "view_cart", "begin_checkout", "purchase_intent"]) {
    ok(ga.some((e) => e.name === n), `GA4 recibe ${n}`);
  }
  const pv = ga.filter((e) => e.name === "page_view").map((e) => e.params.page_path);
  ok(new Set(pv).size === pv.length && pv.includes("/") && pv.includes("/frma-01"), `page_view sin duplicados, incluida la landing (${pv.join(" ")})`);
  const intent = ga.find((e) => e.name === "purchase_intent");
  ok(intent?.params.currency === "CLP" && intent.params.value === 219980 && intent.params.items.length === 2, "purchase_intent con value, CLP e items");
  ok(intent?.params.product_type === "mixto", "purchase_intent diferencia carrito mixto");
  const capView = ga.find((e) => e.name === "view_item" && e.params.items[0].item_id === "frma-01");
  ok(capView?.params.items[0].item_category2 === "capsula", "view_item de cápsula marcado como capsula");
  ok(!meta.includes("Purchase"), "Meta nunca recibe Purchase");
  for (const m of ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "PurchaseIntent"]) ok(meta.includes(m), `Meta recibe ${m}`);
  const leadStatus = await page.getByRole("alert").first().innerText().catch(() => "");
  if (/no está habilitado/.test(leadStatus)) {
    ok(!names.some((n) => n.startsWith("generate_lead")), "sin Supabase: el registro informa que no está habilitado y NO se envía generate_lead");
    ok(!meta.includes("Lead"), "sin Supabase: Meta no recibe Lead");
  } else {
    ok(names.some((n) => n.startsWith("generate_lead")), "con Supabase: generate_lead tras registro exitoso");
  }
  const json = JSON.stringify(ga) + JSON.stringify(await page.evaluate(() => window.fbq?.queue?.map((a) => Array.from(a))));
  ok(!json.includes("prueba@ejemplo.cl"), "ningún evento contiene el correo");
  ok(await page.evaluate(() => document.cookie.includes("_fbc=fb.1.")), "cookie _fbc reconstruida desde fbclid tras consentimiento");
  ok(errors.length === 0, `sin errores JS (${errors.join(" | ")})`);
  await ctx.close();
}

/* 3. Escritorio: capturas y sin scroll horizontal */
{
  for (const [name, path] of [["home", "/"], ["catalogo", "/catalogo"], ["capsula", "/frma-01"], ["producto", "/producto/camisa-oxford"]]) {
    for (const [label, opts] of [["d", { viewport: { width: 1440, height: 900 } }], ["m", devices["iPhone SE"]]]) {
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      await page.route(VENDORS, (r) => r.abort());
      await page.goto(`${BASE}${path}`);
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(overflow <= 0, `${label}:${name} sin scroll horizontal (${overflow}px)`);
      if (SHOTS && label === "d") {
        await page.getByRole("button", { name: "Rechazar" }).click();
        await page.screenshot({ path: `${SHOTS}/d-${name}.png`, fullPage: true });
      }
      await ctx.close();
    }
  }
}

/* 4. Admin protegido */
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const res = await page.goto(`${BASE}/admin/experiment`);
  ok(page.url().includes("/admin/login") || (await page.content()).includes("Supabase no está configurado"), "admin sin sesión no muestra datos");
  const csv = await ctx.request.get(`${BASE}/api/admin/leads`);
  ok(csv.status() === 401, `CSV sin sesión → 401 (${csv.status()})`);
  void res;
  await ctx.close();
}

await browser.close();
console.log(failures ? `\n${failures} verificación(es) fallaron` : "\nTodo OK");
process.exit(failures ? 1 : 0);
