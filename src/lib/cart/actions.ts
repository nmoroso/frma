"use client";

import type { PricedId } from "@/config/pricing";
import { itemFor } from "../analytics/items";
import { track } from "../analytics/track";
import { addLine, cartStore, removeLine, setQuantity, updateCart, type CartLine } from "./cart";

export function lineItem(line: CartLine, price: number, quantity = line.quantity) {
  return itemFor(line.id, price, {
    colorId: line.colorId,
    size: line.size,
    topSize: line.topSize,
    bottomSize: line.bottomSize,
    quantity,
  });
}

export function addToCart(input: Omit<CartLine, "key">, price: number) {
  updateCart((lines) => addLine(lines, input));
  const item = lineItem({ ...input, key: "" }, price, input.quantity);
  track("add_to_cart", { items: [item] });
}

export function changeQuantity(key: string, quantity: number, priceOf: (id: PricedId) => number) {
  const line = cartStore.get().find((l) => l.key === key);
  if (!line) return;
  updateCart((lines) => setQuantity(lines, key, quantity));
  const after = cartStore.get().find((l) => l.key === key)?.quantity ?? 0;
  const delta = after - line.quantity;
  if (delta === 0) return;
  const item = lineItem(line, priceOf(line.id), Math.abs(delta));
  track(delta > 0 ? "add_to_cart" : "remove_from_cart", { items: [item] });
}

export function removeFromCart(key: string, priceOf: (id: PricedId) => number) {
  const line = cartStore.get().find((l) => l.key === key);
  if (!line) return;
  updateCart((lines) => removeLine(lines, key));
  track("remove_from_cart", { items: [lineItem(line, priceOf(line.id))] });
}
