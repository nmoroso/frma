"use client";

import { useSyncExternalStore } from "react";
import { HAS_MESSAGE_EXPERIMENT, HAS_PRICE_EXPERIMENT } from "@/config/experiments";
import { cartReadyStore, cartStore, type CartLine } from "./cart/cart";
import { consentStore, preferencesOpenStore } from "./analytics/consent";
import { getAssignments, resolvePrice } from "./experiments";
import { useCatalog } from "./catalog/context";
import { lineInfo } from "./cart/lines";

const noop = () => () => {};

export function useCart() {
  return useSyncExternalStore(cartStore.subscribe, cartStore.get, () => EMPTY);
}
const EMPTY: never[] = [];

export function useCartReady() {
  return useSyncExternalStore(cartReadyStore.subscribe, cartReadyStore.get, () => false);
}

export function useConsent() {
  return useSyncExternalStore(consentStore.subscribe, consentStore.get, () => undefined);
}

export function usePreferencesOpen() {
  return useSyncExternalStore(preferencesOpenStore.subscribe, preferencesOpenStore.get, () => false);
}

/** Asignaciones de experimentos (null durante SSR). */
export function useAssignments() {
  return useSyncExternalStore(noop, getAssignments, () => null);
}

/** Función de precio: (id de producto o guardarropa, precio base) → precio a mostrar. */
export type PriceOf = (id: string, base: number) => number;

/**
 * Si hay un experimento de precio activo, devuelve null hasta conocer la
 * variante del visitante (así nunca ve dos precios distintos).
 */
export function usePriceOf(): PriceOf | null {
  const assignments = useAssignments();
  if (!HAS_PRICE_EXPERIMENT) return (_id, base) => base;
  return assignments ? (id, base) => resolvePrice(id, base, assignments) : null;
}

export function usePrice(id: string, base: number): number | null {
  const priceOf = usePriceOf();
  return priceOf ? priceOf(id, base) : null;
}

export function useMessageReady() {
  const assignments = useAssignments();
  return !HAS_MESSAGE_EXPERIMENT || assignments !== null;
}

/** Precio unitario de una línea del carrito (null mientras se resuelve un experimento). */
export function useLinePrice(): ((line: CartLine) => number) | null {
  const catalog = useCatalog();
  const priceOf = usePriceOf();
  if (!priceOf) return null;
  return (line) => {
    const info = lineInfo(line, catalog);
    return info ? priceOf(line.id, info.base) : 0;
  };
}
