import { describe, expect, it } from "vitest";
import { buildGa4Params, EVENT_NAMES, toMetaCall } from "@/lib/analytics/events";
import { collectionItem, productItem } from "@/lib/analytics/items";
import { findCollection, findProduct } from "@/lib/catalog/helpers";
import { seedCatalog } from "@/lib/catalog/seed";
import { validateLead } from "@/lib/leads/validate";
import { computeMetrics, type EventRow, type LeadRow } from "@/lib/metrics";

const catalog = seedCatalog();
const tee = findProduct(catalog, "polera-essential")!;
const navy = tee.variants.find((v) => v.slug === "azul-marino")!;
const teeItem = productItem(tee, navy, 19990, { size: "M", quantity: 2 });
const capItem = collectionItem(findCollection(catalog, "frma-01")!, 179990, { topSize: "M", bottomSize: "42" });
const common = { frma_session_id: "s1", experiment_id: "exp", variant_id: "b", experiment_variant_id: "b" };

describe("ítems GA4", () => {
  it("prenda individual con variante y categoría", () => {
    expect(teeItem).toMatchObject({
      item_id: "polera-essential",
      item_name: "Polera Essential",
      item_category: "Poleras",
      item_category2: "prenda_individual",
      item_variant: "Azul marino",
      item_variant_id: "POLERA-ESSENTIAL-AZUL-MARINO",
      item_size: "M",
      price: 19990,
      quantity: 2,
    });
  });
  it("cápsula diferenciada", () => {
    expect(capItem).toMatchObject({ item_id: "frma-01", item_category: "Cápsulas", item_category2: "capsula", item_variant: "Superior M / Pantalón 42" });
  });
});

describe("parámetros GA4", () => {
  it("add_to_cart incluye currency, value, items, experimento", () => {
    const p = buildGa4Params("add_to_cart", { items: [teeItem] }, common);
    expect(p).toMatchObject({ currency: "CLP", value: 39980, product_type: "prenda_individual", experiment_id: "exp", variant_id: "b" });
    expect(p.items).toEqual([teeItem]);
  });
  it("carrito mixto", () => {
    const p = buildGa4Params("begin_checkout", { items: [teeItem, capItem] }, common);
    expect(p.product_type).toBe("mixto");
    expect(p.value).toBe(39980 + 179990);
  });
  it("view_item_list no lleva value", () => {
    const p = buildGa4Params("view_item_list", { items: [teeItem], item_list_id: "catalogo", item_list_name: "Catálogo" }, common);
    expect(p.value).toBeUndefined();
    expect(p.item_list_id).toBe("catalogo");
  });
  it("generate_lead nunca incluye el correo", () => {
    const p = buildGa4Params("generate_lead", { lead_interest: "frma-01" }, common);
    expect(JSON.stringify(p)).not.toMatch(/@/);
    expect(p).toMatchObject({ lead_interest: "frma-01", currency: "CLP", value: 0 });
  });
  it("lista de eventos esperada", () => {
    expect([...EVENT_NAMES].sort()).toEqual(
      ["page_view", "view_item_list", "select_item", "view_item", "select_color", "add_to_cart", "remove_from_cart", "view_cart", "begin_checkout", "purchase_intent", "generate_lead"].sort(),
    );
  });
  it("select_color lleva producto, variante y color", () => {
    const p = buildGa4Params("select_color", { color: { product_id: tee.id, product_name: tee.name, variant_id: navy.sku, color_name: navy.name } }, common);
    expect(p).toMatchObject({ product_id: "polera-essential", product_name: "Polera Essential", variant_id: "POLERA-ESSENTIAL-AZUL-MARINO", color_name: "Azul marino", experiment_id: "exp", experiment_variant_id: "b" });
    expect(p.items).toBeUndefined();
  });
});

describe("Meta Pixel", () => {
  it("mapea a eventos estándar y personalizados correctos", () => {
    const map = Object.fromEntries(EVENT_NAMES.map((n) => [n, toMetaCall(n, { items: [teeItem] }, common)?.event ?? null]));
    expect(map).toEqual({
      page_view: "PageView",
      view_item_list: null,
      select_color: null,
      select_item: null,
      view_item: "ViewContent",
      add_to_cart: "AddToCart",
      remove_from_cart: null,
      view_cart: null,
      begin_checkout: "InitiateCheckout",
      purchase_intent: "PurchaseIntent",
      generate_lead: "Lead",
    });
  });
  it("PurchaseIntent es trackCustom y nunca se envía Purchase", () => {
    const call = toMetaCall("purchase_intent", { items: [capItem] }, common)!;
    expect(call.method).toBe("trackCustom");
    for (const n of EVENT_NAMES) expect(toMetaCall(n, { items: [teeItem] }, common)?.event).not.toBe("Purchase");
  });
  it("AddToCart incluye contents y CLP", () => {
    const call = toMetaCall("add_to_cart", { items: [teeItem] }, common)!;
    expect(call.params).toMatchObject({ content_ids: ["polera-essential"], currency: "CLP", value: 39980, content_type: "product" });
  });
});

describe("validación de leads", () => {
  const now = 1_800_000_000_000;
  const base = { email: "  Juan@Correo.CL ", consent: true, interest: ["frma-01", "<script>"], started_at: now - 5000, website: "" };

  it("normaliza correo y filtra intereses con formato inválido", () => {
    const r = validateLead({ ...base, utm_source: "instagram" }, now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.lead.email).toBe("juan@correo.cl");
      expect(r.lead.interest).toEqual(["frma-01"]);
      expect(r.lead.utm_source).toBe("instagram");
    }
  });
  it("exige consentimiento explícito", () => {
    expect(validateLead({ ...base, consent: "true" }, now)).toEqual({ ok: false, reason: "no_consent" });
  });
  it("rechaza correos inválidos", () => {
    for (const email of ["", "juan", "juan@", "@x.cl", "a b@x.cl", "x@y"]) {
      expect(validateLead({ ...base, email }, now)).toMatchObject({ ok: false });
    }
  });
  it("detecta spam: campo trampa y envío demasiado rápido", () => {
    expect(validateLead({ ...base, website: "http://spam" }, now)).toEqual({ ok: false, reason: "spam" });
    expect(validateLead({ ...base, started_at: now - 200 }, now)).toEqual({ ok: false, reason: "spam" });
    expect(validateLead({ ...base, started_at: undefined }, now)).toEqual({ ok: false, reason: "spam" });
  });
});

describe("métricas del experimento", () => {
  const ev = (event_name: string, session_id: string, extra: Partial<EventRow> = {}): EventRow => ({
    created_at: "2026-11-20T10:00:00Z",
    event_name,
    session_id,
    visitor_id: `v-${session_id}`,
    items: [],
    value: null,
    utm_source: "instagram",
    utm_campaign: "frma01",
    experiment_id: null,
    variant_id: null,
    is_internal: false,
    ...extra,
  });
  const cap = [{ id: "frma-01", type: "capsula", price: 179990, qty: 1 }];
  const events: EventRow[] = [
    ev("page_view", "s1"),
    ev("view_item", "s1", { items: cap }),
    ev("add_to_cart", "s1", { items: cap }),
    ev("begin_checkout", "s1", { items: cap }),
    ev("purchase_intent", "s1", { items: cap }),
    ev("page_view", "s2", { utm_source: null, utm_campaign: null }),
    ev("page_view", "s3", { is_internal: true }),
    ev("purchase_intent", "s3", { is_internal: true, items: cap }),
  ];
  const leads: LeadRow[] = [
    { created_at: "2026-11-20T10:05:00Z", interest: ["frma-01"], utm_source: "instagram", utm_campaign: "frma01", variant_id: null, is_internal: false },
    { created_at: "2026-11-20T10:06:00Z", interest: ["general"], utm_source: null, utm_campaign: null, variant_id: null, is_internal: true },
  ];

  it("separa tráfico real de interno y calcula embudo", () => {
    const m = computeMetrics(events, leads, "real");
    expect(m.sessions).toBe(2);
    expect(m.funnel.map((s) => s.sessions)).toEqual([2, 1, 1, 1, 1, 0]);
    expect(m.funnel[1].rateFromPrev).toBe(0.5);
    expect(m.leadsConfirmed).toBe(1);
    expect(m.internalEvents).toBe(2);
  });
  it("desglosa por campaña y producto", () => {
    const m = computeMetrics(events, leads, "real");
    const ig = m.campaigns.find((c) => c.name === "instagram / frma01")!;
    expect(ig).toMatchObject({ sessions: 1, purchaseIntent: 1, leads: 1 });
    expect(m.campaigns.find((c) => c.name === "(directo / sin UTM)")!.sessions).toBe(1);
    const p = m.products.find((x) => x.id === "frma-01")!;
    expect(p).toMatchObject({ type: "capsula", viewSessions: 1, addUnits: 1, intentSessions: 1, intentValue: 179990, leadsInterested: 1 });
  });
  it("preferencia por color", () => {
    const tee = (variant: string, qty = 1) => [{ id: "polera-essential", type: "prenda_individual", price: 19990, qty, variant, variant_id: null }];
    const m = computeMetrics(
      [
        ev("select_color", "s1", { items: tee("Azul marino") }),
        ev("select_color", "s2", { items: tee("Azul marino") }),
        ev("add_to_cart", "s1", { items: tee("Azul marino", 2) }),
        ev("add_to_cart", "s2", { items: tee("Blanco / M") }),
        ev("purchase_intent", "s1", { items: tee("Azul marino", 2) }),
      ],
      [],
      "real",
    );
    expect(m.colors).toEqual([
      { productId: "polera-essential", color: "Azul marino", selectSessions: 2, addUnits: 2, intentUnits: 2 },
      { productId: "polera-essential", color: "Blanco", selectSessions: 0, addUnits: 1, intentUnits: 0 },
    ]);
  });
  it("sin datos devuelve ceros, no cifras inventadas", () => {
    const m = computeMetrics([], [], "real");
    expect(m.sessions).toBe(0);
    expect(m.funnel.every((s) => s.sessions === 0 && (s.rateFromPrev === null))).toBe(true);
  });
});
