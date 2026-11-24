import { categoryName } from "../catalog/helpers";
import type { Collection, Product, Variant } from "../catalog/types";

/**
 * Ítem con el esquema de GA4 (https://developers.google.com/analytics/devguides/collection/ga4/reference/events).
 * - item_variant   = nombre del color seleccionado (p. ej. "Azul marino")
 * - item_variant_id= SKU del color (parámetro personalizado de ítem)
 * - item_size      = talla (parámetro personalizado de ítem)
 */
export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_brand: "FRMA";
  item_category: string;
  /** Diferencia cápsulas/guardarropas de prendas individuales. */
  item_category2: "prenda_individual" | "capsula";
  item_variant?: string;
  item_variant_id?: string;
  item_size?: string;
  price: number;
  quantity: number;
  item_list_id?: string;
  item_list_name?: string;
  index?: number;
};

export type ProductType = "prenda_individual" | "capsula" | "mixto";
type ListOpts = { quantity?: number; list?: { id: string; name: string }; index?: number };

function listFields(opts: ListOpts) {
  return {
    quantity: opts.quantity ?? 1,
    ...(opts.list ? { item_list_id: opts.list.id, item_list_name: opts.list.name } : {}),
    ...(typeof opts.index === "number" ? { index: opts.index } : {}),
  };
}

export function productItem(product: Product, variant: Variant | undefined, price: number, opts: ListOpts & { size?: string } = {}): AnalyticsItem {
  return {
    item_id: product.id,
    item_name: product.name,
    item_brand: "FRMA",
    item_category: categoryName(product.category),
    item_category2: "prenda_individual",
    ...(variant ? { item_variant: variant.name, item_variant_id: variant.sku } : {}),
    ...(opts.size ? { item_size: opts.size } : {}),
    price,
    ...listFields(opts),
  };
}

export function collectionItem(collection: Collection, price: number, opts: ListOpts & { topSize?: string; bottomSize?: string } = {}): AnalyticsItem {
  const size = opts.topSize && opts.bottomSize ? `Superior ${opts.topSize} / Pantalón ${opts.bottomSize}` : undefined;
  return {
    item_id: collection.id,
    item_name: collection.name,
    item_brand: "FRMA",
    item_category: "Cápsulas",
    item_category2: "capsula",
    ...(size ? { item_variant: size, item_size: size } : {}),
    price,
    ...listFields(opts),
  };
}

export function itemsValue(items: AnalyticsItem[]) {
  return items.reduce((s, i) => s + i.price * i.quantity, 0);
}

export function productTypeOf(items: AnalyticsItem[]): ProductType {
  const types = new Set(items.map((i) => i.item_category2));
  if (types.size > 1) return "mixto";
  return types.has("capsula") ? "capsula" : "prenda_individual";
}
