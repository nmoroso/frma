"use client";

import type { Catalog } from "../catalog/types";
import type { AnalyticsItem } from "../analytics/items";
import { track } from "../analytics/track";
import { addLine, cartStore, removeLine, setQuantity, updateCart, type CartLine } from "./cart";
import { lineAnalyticsItem } from "./lines";

/** Agrega al carrito y registra add_to_cart con la variante de color. */
export function addToCart(input: Omit<CartLine, "key">, item: AnalyticsItem) {
  updateCart((lines) => addLine(lines, input));
  track("add_to_cart", { items: [{ ...item, quantity: input.quantity }] });
}

export function changeQuantity(key: string, quantity: number, catalog: Catalog, unitPrice: (line: CartLine) => number) {
  const line = cartStore.get().find((l) => l.key === key);
  if (!line) return;
  updateCart((lines) => setQuantity(lines, key, quantity));
  const after = cartStore.get().find((l) => l.key === key)?.quantity ?? 0;
  const delta = after - line.quantity;
  if (delta === 0) return;
  const item = lineAnalyticsItem(line, catalog, unitPrice(line), Math.abs(delta));
  if (item) track(delta > 0 ? "add_to_cart" : "remove_from_cart", { items: [item] });
}

export function removeFromCart(key: string, catalog: Catalog, unitPrice: (line: CartLine) => number) {
  const line = cartStore.get().find((l) => l.key === key);
  if (!line) return;
  updateCart((lines) => removeLine(lines, key));
  const item = lineAnalyticsItem(line, catalog, unitPrice(line));
  if (item) track("remove_from_cart", { items: [item] });
}
