"use client";

import type { Product, Variant } from "../catalog/types";
import { track } from "./track";

/**
 * Registra que el visitante eligió un color. Solo se llama ante una acción
 * del usuario (nunca al cargar la página) y solo si el color cambió.
 */
export function trackSelectColor(product: Product, variant: Variant, previousSlug: string | undefined, list?: { id: string; name: string }) {
  if (variant.slug === previousSlug) return;
  track("select_color", {
    color: { product_id: product.id, product_name: product.name, variant_id: variant.sku, color_name: variant.name },
    ...(list ? { item_list_id: list.id, item_list_name: list.name } : {}),
  });
}
