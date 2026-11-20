/**
 * Carrito: lógica pura + store persistido en localStorage.
 * No genera órdenes ni pagos: solo registra la intención del visitante.
 */
import { CAPSULE, getProductById } from "@/config/catalog";
import type { PricedId } from "@/config/pricing";
import { createStore, readJSON, writeJSON } from "../storage";

export type CartLine = {
  key: string;
  id: PricedId;
  kind: "product" | "capsule";
  colorId?: string;
  size?: string;
  topSize?: string;
  bottomSize?: string;
  quantity: number;
};

export const MAX_QTY = 10;
const KEY = "frma_cart_v1";

export function lineKey(l: Omit<CartLine, "key" | "quantity">) {
  return [l.id, l.colorId, l.size, l.topSize, l.bottomSize].filter(Boolean).join("|");
}

export function addLine(lines: CartLine[], input: Omit<CartLine, "key">): CartLine[] {
  const key = lineKey(input);
  const existing = lines.find((l) => l.key === key);
  if (existing) {
    return lines.map((l) =>
      l.key === key ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + input.quantity) } : l,
    );
  }
  return [...lines, { ...input, key, quantity: clampQty(input.quantity) }];
}

export function setQuantity(lines: CartLine[], key: string, quantity: number): CartLine[] {
  if (quantity <= 0) return removeLine(lines, key);
  return lines.map((l) => (l.key === key ? { ...l, quantity: clampQty(quantity) } : l));
}

export function removeLine(lines: CartLine[], key: string): CartLine[] {
  return lines.filter((l) => l.key !== key);
}

export function subtotal(lines: CartLine[], priceOf: (id: PricedId) => number) {
  return lines.reduce((s, l) => s + priceOf(l.id) * l.quantity, 0);
}

export function count(lines: CartLine[]) {
  return lines.reduce((s, l) => s + l.quantity, 0);
}

function clampQty(q: number) {
  return Math.max(1, Math.min(MAX_QTY, Math.floor(q) || 1));
}

/** Descarta líneas que ya no existen en el catálogo (p. ej. si se editó la config). */
export function sanitize(lines: unknown): CartLine[] {
  if (!Array.isArray(lines)) return [];
  return lines.filter((l): l is CartLine => {
    if (!l || typeof l !== "object") return false;
    const line = l as CartLine;
    if (line.id === CAPSULE.id) return Boolean(line.topSize && line.bottomSize);
    const p = getProductById(line.id);
    return Boolean(p && p.colors.some((c) => c.id === line.colorId) && p.sizes.includes(line.size ?? ""));
  });
}

/* ---------- store del navegador ---------- */

export const cartStore = createStore<CartLine[]>([]);
export const cartReadyStore = createStore(false);

export function hydrateCart() {
  cartStore.set(sanitize(readJSON(KEY, [])));
  cartReadyStore.set(true);
}

export function updateCart(fn: (lines: CartLine[]) => CartLine[]) {
  const next = fn(cartStore.get());
  cartStore.set(next);
  writeJSON(KEY, next);
}
