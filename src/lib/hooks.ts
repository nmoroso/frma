"use client";

import { useSyncExternalStore } from "react";
import { HAS_MESSAGE_EXPERIMENT, HAS_PRICE_EXPERIMENT } from "@/config/experiments";
import type { PricedId } from "@/config/pricing";
import { PRICES } from "@/config/pricing";
import { cartReadyStore, cartStore } from "./cart/cart";
import { consentStore, preferencesOpenStore } from "./analytics/consent";
import { getAssignments, resolvePrice } from "./experiments";

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

/**
 * Precio a mostrar. Si hay un experimento de precio activo, devuelve null hasta
 * conocer la variante del visitante (así nunca ve dos precios distintos).
 */
export function usePrice(id: PricedId): number | null {
  const assignments = useAssignments();
  if (!HAS_PRICE_EXPERIMENT) return PRICES[id];
  return assignments ? resolvePrice(id, assignments) : null;
}

/** Función de precio para listas (carrito, cápsula). */
export function usePriceFn(): ((id: PricedId) => number) | null {
  const assignments = useAssignments();
  if (!HAS_PRICE_EXPERIMENT) return (id) => PRICES[id];
  return assignments ? (id) => resolvePrice(id, assignments) : null;
}

export function useMessageReady() {
  const assignments = useAssignments();
  return !HAS_MESSAGE_EXPERIMENT || assignments !== null;
}
