/**
 * Punto único para enviar eventos. Uso:
 *   track("add_to_cart", { items: [item] })
 *
 * Reglas:
 *  - Sin consentimiento de analítica no se envía nada a GA4/Clarity/medición propia.
 *  - Sin consentimiento de marketing no se envía nada a Meta.
 *  - Mientras el visitante no ha decidido, los eventos quedan en memoria (no se
 *    envían ni se guardan) y se despachan solo si acepta. Si rechaza, se descartan.
 *  - Nunca se envían nombres, correos ni otros datos personales.
 */
import { getAssignments, experimentParams } from "../experiments";
import { getLastTouch, getSessionId, getVisitorId, isInternalTraffic } from "./attribution";
import { consentStore } from "./consent";
import { buildGa4Params, toMetaCall, type CommonParams, type EventInput, type EventName } from "./events";
import { itemsValue } from "./items";
import { DEBUG, isLoaded } from "./vendors";

type Pending = { name: EventName; input: EventInput; at: number };
const MAX_PENDING = 30;
let pending: Pending[] = [];

const FIRST_PARTY = process.env.NEXT_PUBLIC_FIRST_PARTY_EVENTS !== "false";

export function commonParams(): CommonParams {
  return {
    frma_session_id: getSessionId(),
    traffic_type: isInternalTraffic() ? "internal" : undefined,
    ...experimentParams(getAssignments()),
  };
}

export function track(name: EventName, input: EventInput = {}) {
  if (typeof window === "undefined") return;
  const consent = consentStore.get();
  if (consent === undefined || consent === null) {
    // Aún sin decisión: retener en memoria (no persistido).
    pending.push({ name, input, at: Date.now() });
    if (pending.length > MAX_PENDING) pending = pending.slice(-MAX_PENDING);
    log(name, [], true);
    return;
  }
  dispatch(name, input, consent.analytics, consent.marketing);
}

/** Llamado por el AnalyticsProvider cuando el visitante decide. */
export function flushPending(granted: boolean) {
  const queue = pending;
  pending = [];
  if (!granted) return;
  const c = consentStore.get();
  for (const e of queue) dispatch(e.name, e.input, Boolean(c?.analytics), Boolean(c?.marketing));
}

function dispatch(name: EventName, input: EventInput, analytics: boolean, marketing: boolean) {
  const common = commonParams();
  const sent: string[] = [];

  if (analytics && isLoaded("ga4") && window.gtag) {
    window.gtag("event", name, buildGa4Params(name, input, common));
    sent.push("ga4");
  }
  if (marketing && isLoaded("metaPixel") && window.fbq) {
    const call = toMetaCall(name, input, common);
    if (call) {
      window.fbq(call.method, call.event, call.params);
      sent.push(`meta:${call.event}`);
    }
  }
  if (analytics && isLoaded("clarity") && window.clarity && name !== "page_view") {
    window.clarity("event", name);
    sent.push("clarity");
  }
  if (analytics && FIRST_PARTY) {
    sendFirstParty(name, input, common);
    sent.push("first-party");
  }
  log(name, sent);
}

function sendFirstParty(name: EventName, input: EventInput, common: CommonParams) {
  const last = getLastTouch();
  const body = JSON.stringify({
    event_name: name,
    session_id: common.frma_session_id,
    visitor_id: getVisitorId(),
    page_path: input.page_path ?? window.location.pathname,
    items: (input.items ?? []).map((i) => ({
      id: i.item_id,
      type: i.item_category2,
      variant: i.item_variant,
      price: i.price,
      qty: i.quantity,
    })),
    value: input.value ?? (input.items?.length ? itemsValue(input.items) : undefined),
    lead_interest: input.lead_interest,
    utm_source: last.utm_source,
    utm_medium: last.utm_medium,
    utm_campaign: last.utm_campaign,
    utm_content: last.utm_content,
    utm_term: last.utm_term,
    has_fbclid: Boolean(last.fbclid),
    experiment_id: common.experiment_id,
    variant_id: common.variant_id,
    is_internal: common.traffic_type === "internal",
  });
  try {
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/events", blob)) {
      void fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    }
  } catch {
    /* la medición nunca debe romper la navegación */
  }
}

/** Registro en memoria para QA: window.frmaEventLog (sin datos personales). */
function log(name: string, sent: string[], pendingConsent = false) {
  window.frmaEventLog = window.frmaEventLog || [];
  window.frmaEventLog.push({ name, at: new Date().toISOString(), sent, pendingConsent });
  if (window.frmaEventLog.length > 200) window.frmaEventLog.shift();
  if (DEBUG) {
    const dest = pendingConsent ? "en espera de consentimiento" : sent.length ? sent.join(", ") : "sin destino (sin consentimiento)";
    console.info(`[FRMA analytics] ${name} →`, dest);
  }
}
