import {
  CAPSULE,
  getCategoryName,
  getColor,
  getProductById,
  type Product,
} from "@/config/catalog";
import type { PricedId } from "@/config/pricing";

/** Ítem con el esquema de GA4 (https://developers.google.com/analytics/devguides/collection/ga4/reference/events). */
export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_brand: "FRMA";
  item_category: string;
  /** Diferencia cápsulas de prendas individuales. */
  item_category2: "prenda_individual" | "capsula";
  item_variant?: string;
  price: number;
  quantity: number;
  item_list_id?: string;
  item_list_name?: string;
  index?: number;
};

export type ProductType = "prenda_individual" | "capsula" | "mixto";

export function productItem(
  product: Product,
  price: number,
  opts: { colorId?: string; size?: string; quantity?: number; list?: { id: string; name: string }; index?: number } = {},
): AnalyticsItem {
  const color = opts.colorId ? getColor(product, opts.colorId) : undefined;
  const variant = [color?.name, opts.size].filter(Boolean).join(" / ");
  return {
    item_id: product.id,
    item_name: product.name,
    item_brand: "FRMA",
    item_category: getCategoryName(product.category),
    item_category2: "prenda_individual",
    ...(variant ? { item_variant: variant } : {}),
    price,
    quantity: opts.quantity ?? 1,
    ...(opts.list ? { item_list_id: opts.list.id, item_list_name: opts.list.name } : {}),
    ...(typeof opts.index === "number" ? { index: opts.index } : {}),
  };
}

export function capsuleItem(
  price: number,
  opts: { topSize?: string; bottomSize?: string; quantity?: number; list?: { id: string; name: string }; index?: number } = {},
): AnalyticsItem {
  const variant =
    opts.topSize && opts.bottomSize ? `Superior ${opts.topSize} / Pantalón ${opts.bottomSize}` : undefined;
  return {
    item_id: CAPSULE.id,
    item_name: CAPSULE.name,
    item_brand: "FRMA",
    item_category: "Cápsulas",
    item_category2: "capsula",
    ...(variant ? { item_variant: variant } : {}),
    price,
    quantity: opts.quantity ?? 1,
    ...(opts.list ? { item_list_id: opts.list.id, item_list_name: opts.list.name } : {}),
    ...(typeof opts.index === "number" ? { index: opts.index } : {}),
  };
}

export function itemFor(id: PricedId, price: number, opts: Parameters<typeof productItem>[2] & { topSize?: string; bottomSize?: string } = {}) {
  if (id === CAPSULE.id) return capsuleItem(price, opts);
  return productItem(getProductById(id)!, price, opts);
}

export function itemsValue(items: AnalyticsItem[]) {
  return items.reduce((s, i) => s + i.price * i.quantity, 0);
}

export function productTypeOf(items: AnalyticsItem[]): ProductType {
  const types = new Set(items.map((i) => i.item_category2));
  if (types.size > 1) return "mixto";
  return types.has("capsula") ? "capsula" : "prenda_individual";
}
