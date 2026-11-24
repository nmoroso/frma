/**
 * Cálculo de métricas del experimento a partir de datos REALES guardados
 * en Supabase (funnel_events y leads). Funciones puras: se prueban en tests/.
 */

export type EventRow = {
  created_at: string;
  event_name: string;
  session_id: string;
  visitor_id: string;
  items: { id: string | null; type: string; price: number | null; qty: number; variant?: string | null; variant_id?: string | null }[] | null;
  value: number | null;
  utm_source: string | null;
  utm_campaign: string | null;
  experiment_id: string | null;
  variant_id: string | null;
  is_internal: boolean;
};

export type LeadRow = {
  created_at: string;
  interest: string[] | null;
  utm_source: string | null;
  utm_campaign: string | null;
  variant_id: string | null;
  is_internal: boolean;
};

export type TrafficFilter = "real" | "interno" | "todo";

export const STAGES = [
  { id: "page_view", label: "Visitas" },
  { id: "view_item", label: "Vieron un producto" },
  { id: "add_to_cart", label: "Agregaron al carrito" },
  { id: "begin_checkout", label: "Iniciaron checkout" },
  { id: "purchase_intent", label: "Intención final de compra" },
  { id: "generate_lead", label: "Dejaron su correo" },
] as const;

export function filterTraffic<T extends { is_internal: boolean }>(rows: T[], f: TrafficFilter) {
  if (f === "todo") return rows;
  return rows.filter((r) => (f === "interno" ? r.is_internal : !r.is_internal));
}

const pct = (a: number, b: number) => (b > 0 ? a / b : null);

type Funnel = { id: string; label: string; sessions: number; rateFromPrev: number | null; rateFromStart: number | null }[];

function funnelFor(events: EventRow[]): Funnel {
  const sets = new Map<string, Set<string>>();
  for (const e of events) {
    if (!sets.has(e.event_name)) sets.set(e.event_name, new Set());
    sets.get(e.event_name)!.add(e.session_id);
  }
  const counts = STAGES.map((s) => sets.get(s.id)?.size ?? 0);
  return STAGES.map((s, i) => ({
    id: s.id,
    label: s.label,
    sessions: counts[i],
    rateFromPrev: i === 0 ? null : pct(counts[i], counts[i - 1]),
    rateFromStart: i === 0 ? null : pct(counts[i], counts[0]),
  }));
}

/** Atribución por sesión: la primera campaña vista en esa sesión. */
function sessionCampaign(events: EventRow[]) {
  const map = new Map<string, string>();
  const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const e of sorted) {
    if (!map.has(e.session_id)) map.set(e.session_id, campaignLabel(e.utm_source, e.utm_campaign));
  }
  return map;
}

export function campaignLabel(source: string | null, campaign: string | null) {
  if (!source && !campaign) return "(directo / sin UTM)";
  return `${source || "?"} / ${campaign || "(sin campaña)"}`;
}

export function computeMetrics(allEvents: EventRow[], allLeads: LeadRow[], traffic: TrafficFilter) {
  const events = filterTraffic(allEvents, traffic);
  const leads = filterTraffic(allLeads, traffic);

  const visitors = new Set(events.map((e) => e.visitor_id)).size;
  const sessions = new Set(events.map((e) => e.session_id)).size;

  // Por campaña
  const campOf = sessionCampaign(events);
  const byCampaign = new Map<string, EventRow[]>();
  for (const e of events) {
    const c = campOf.get(e.session_id)!;
    if (!byCampaign.has(c)) byCampaign.set(c, []);
    byCampaign.get(c)!.push(e);
  }
  const leadsByCampaign = new Map<string, number>();
  for (const l of leads) {
    const c = campaignLabel(l.utm_source, l.utm_campaign);
    leadsByCampaign.set(c, (leadsByCampaign.get(c) ?? 0) + 1);
  }
  const campaignNames = new Set([...byCampaign.keys(), ...leadsByCampaign.keys()]);
  const campaigns = [...campaignNames]
    .map((name) => {
      const f = funnelFor(byCampaign.get(name) ?? []);
      const get = (id: string) => f.find((s) => s.id === id)!.sessions;
      return {
        name,
        sessions: new Set((byCampaign.get(name) ?? []).map((e) => e.session_id)).size,
        viewItem: get("view_item"),
        addToCart: get("add_to_cart"),
        beginCheckout: get("begin_checkout"),
        purchaseIntent: get("purchase_intent"),
        leads: leadsByCampaign.get(name) ?? 0,
      };
    })
    .sort((a, b) => b.sessions - a.sessions);

  // Por producto / cápsula
  const prod = new Map<string, { id: string; type: string; views: Set<string>; addUnits: number; addSessions: Set<string>; checkout: Set<string>; intent: Set<string>; intentUnits: number; intentValue: number }>();
  const ensure = (id: string, type: string) => {
    if (!prod.has(id)) prod.set(id, { id, type, views: new Set(), addUnits: 0, addSessions: new Set(), checkout: new Set(), intent: new Set(), intentUnits: 0, intentValue: 0 });
    return prod.get(id)!;
  };
  for (const e of events) {
    for (const it of e.items ?? []) {
      if (!it.id) continue;
      const p = ensure(it.id, it.type);
      if (e.event_name === "view_item") p.views.add(e.session_id);
      if (e.event_name === "add_to_cart") {
        p.addUnits += it.qty;
        p.addSessions.add(e.session_id);
      }
      if (e.event_name === "begin_checkout") p.checkout.add(e.session_id);
      if (e.event_name === "purchase_intent") {
        p.intent.add(e.session_id);
        p.intentUnits += it.qty;
        p.intentValue += (it.price ?? 0) * it.qty;
      }
    }
  }
  const leadInterest = new Map<string, number>();
  for (const l of leads) for (const i of l.interest ?? []) leadInterest.set(i, (leadInterest.get(i) ?? 0) + 1);
  const products = [...prod.values()]
    .map((p) => ({
      id: p.id,
      type: p.type,
      viewSessions: p.views.size,
      addSessions: p.addSessions.size,
      addUnits: p.addUnits,
      checkoutSessions: p.checkout.size,
      intentSessions: p.intent.size,
      intentUnits: p.intentUnits,
      intentValue: p.intentValue,
      viewToAdd: pct(p.addSessions.size, p.views.size),
      leadsInterested: leadInterest.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.viewSessions - a.viewSessions);

  // Por variante de experimento
  const byVariant = new Map<string, EventRow[]>();
  for (const e of events) {
    if (!e.experiment_id) continue;
    const k = `${e.experiment_id} → ${e.variant_id}`;
    if (!byVariant.has(k)) byVariant.set(k, []);
    byVariant.get(k)!.push(e);
  }
  const variants = [...byVariant.entries()].map(([name, rows]) => {
    const f = funnelFor(rows);
    const s = new Set(rows.map((r) => r.session_id)).size;
    const intent = f.find((x) => x.id === "purchase_intent")!.sessions;
    return { name, sessions: s, addToCart: f.find((x) => x.id === "add_to_cart")!.sessions, purchaseIntent: intent, intentRate: pct(intent, s) };
  });

  // Preferencia por producto y color (select_color, add_to_cart e intención por variante)
  const colorMap = new Map<string, { productId: string; color: string; selects: Set<string>; addUnits: number; intentUnits: number }>();
  for (const e of events) {
    if (!["select_color", "add_to_cart", "purchase_intent"].includes(e.event_name)) continue;
    for (const it of e.items ?? []) {
      if (!it.id || it.type === "capsula" || !it.variant) continue;
      const color = it.variant.split(" / ")[0]; // compatibilidad con eventos antiguos "Color / Talla"
      const k = `${it.id}::${color}`;
      const c = colorMap.get(k) ?? { productId: it.id, color, selects: new Set<string>(), addUnits: 0, intentUnits: 0 };
      if (e.event_name === "select_color") c.selects.add(e.session_id);
      if (e.event_name === "add_to_cart") c.addUnits += it.qty;
      if (e.event_name === "purchase_intent") c.intentUnits += it.qty;
      colorMap.set(k, c);
    }
  }
  const colors = [...colorMap.values()]
    .map((c) => ({ productId: c.productId, color: c.color, selectSessions: c.selects.size, addUnits: c.addUnits, intentUnits: c.intentUnits }))
    .sort((a, b) => b.addUnits - a.addUnits || b.selectSessions - a.selectSessions);

  return {
    visitors,
    sessions,
    colors,
    eventsCount: events.length,
    funnel: funnelFor(events),
    leadsConfirmed: leads.length,
    leadsRate: pct(leads.length, sessions),
    campaigns,
    products,
    variants,
    internalEvents: allEvents.filter((e) => e.is_internal).length,
    internalLeads: allLeads.filter((l) => l.is_internal).length,
  };
}

export type Metrics = ReturnType<typeof computeMetrics>;
