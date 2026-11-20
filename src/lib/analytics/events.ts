/**
 * Lógica pura (sin navegador) de los eventos: nombres permitidos,
 * parámetros GA4 y traducción a Meta Pixel. Se prueba en tests/.
 */
import { itemsValue, productTypeOf, type AnalyticsItem } from "./items";

export const EVENT_NAMES = [
  "page_view",
  "view_item_list",
  "select_item",
  "view_item",
  "add_to_cart",
  "remove_from_cart",
  "view_cart",
  "begin_checkout",
  "purchase_intent",
  "generate_lead",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export type EventInput = {
  items?: AnalyticsItem[];
  value?: number;
  item_list_id?: string;
  item_list_name?: string;
  /** p. ej. producto de interés en generate_lead (nunca el email). */
  lead_interest?: string;
  page_path?: string;
  page_location?: string;
  page_title?: string;
};

export type CommonParams = Record<string, string | number | boolean | undefined>;

const ITEM_EVENTS: EventName[] = [
  "view_item_list",
  "select_item",
  "view_item",
  "add_to_cart",
  "remove_from_cart",
  "view_cart",
  "begin_checkout",
  "purchase_intent",
];

/** Parámetros finales que se envían a GA4. */
export function buildGa4Params(name: EventName, input: EventInput, common: CommonParams) {
  const params: Record<string, unknown> = { ...stripUndefined(common) };
  if (input.page_path) params.page_path = input.page_path;
  if (input.page_location) params.page_location = input.page_location;
  if (input.page_title) params.page_title = input.page_title;
  if (input.item_list_id) params.item_list_id = input.item_list_id;
  if (input.item_list_name) params.item_list_name = input.item_list_name;

  if (input.items && ITEM_EVENTS.includes(name)) {
    params.currency = "CLP";
    params.items = input.items;
    params.product_type = productTypeOf(input.items);
    if (name !== "view_item_list" && name !== "select_item") {
      params.value = input.value ?? itemsValue(input.items);
    }
  }
  if (name === "generate_lead") {
    params.currency = "CLP";
    params.value = 0;
    if (input.lead_interest) params.lead_interest = input.lead_interest;
  }
  return params;
}

export type MetaCall = { method: "track" | "trackCustom"; event: string; params: Record<string, unknown> };

/**
 * Traduce un evento a Meta Pixel. Devuelve null si no corresponde enviar nada.
 * IMPORTANTE: nunca se envía "Purchase" porque no existen ventas.
 */
export function toMetaCall(name: EventName, input: EventInput, common: CommonParams): MetaCall | null {
  const items = input.items ?? [];
  const exp = pick(common, ["experiment_id", "variant_id", "traffic_type"]);
  const commerce = {
    content_ids: items.map((i) => i.item_id),
    content_type: "product",
    contents: items.map((i) => ({ id: i.item_id, quantity: i.quantity, item_price: i.price })),
    currency: "CLP",
    value: input.value ?? itemsValue(items),
    ...(items.length ? { product_type: productTypeOf(items) } : {}),
    ...exp,
  };
  let call: MetaCall | null = null;
  switch (name) {
    case "page_view":
      call = { method: "track", event: "PageView", params: exp };
      break;
    case "view_item":
      call = {
        method: "track",
        event: "ViewContent",
        params: { ...commerce, content_name: items[0]?.item_name, content_category: items[0]?.item_category },
      };
      break;
    case "add_to_cart":
      call = { method: "track", event: "AddToCart", params: commerce };
      break;
    case "begin_checkout":
      call = {
        method: "track",
        event: "InitiateCheckout",
        params: { ...commerce, num_items: items.reduce((s, i) => s + i.quantity, 0) },
      };
      break;
    case "purchase_intent":
      call = { method: "trackCustom", event: "PurchaseIntent", params: commerce };
      break;
    case "generate_lead":
      call = {
        method: "track",
        event: "Lead",
        params: { content_name: input.lead_interest ?? "general", currency: "CLP", value: 0, ...exp },
      };
      break;
    default:
      call = null;
  }
  if (call && call.event === "Purchase") return null; // salvaguarda explícita
  return call;
}

function stripUndefined(o: CommonParams) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ""));
}

function pick(o: CommonParams, keys: string[]) {
  return Object.fromEntries(keys.filter((k) => o[k] !== undefined && o[k] !== "").map((k) => [k, o[k]]));
}
