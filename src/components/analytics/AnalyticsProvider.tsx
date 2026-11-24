"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { getAssignments } from "@/lib/experiments";
import { hydrateCart } from "@/lib/cart/cart";
import { useCatalog } from "@/lib/catalog/context";
import { captureAttribution, getLastTouch, isInternalTraffic } from "@/lib/analytics/attribution";
import { consentStore, loadConsent } from "@/lib/analytics/consent";
import { flushPending, track } from "@/lib/analytics/track";
import { loadClarity, loadGA4, loadMetaPixel, updateGA4Marketing } from "@/lib/analytics/vendors";

/**
 * Inicializa carrito, atribución, consentimiento y plataformas de analítica.
 * También envía page_view en cada cambio de ruta (una sola vez por ruta).
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const catalog = useCatalog();
  const lastPage = useRef<string | null>(null);
  const catalogRef = useRef(catalog);

  // 1) Arranque
  useEffect(() => {
    captureAttribution(new URL(window.location.href), document.referrer);
    hydrateCart(catalogRef.current);

    const apply = () => {
      const c = consentStore.get();
      if (c === undefined || c === null) return;
      const internal = isInternalTraffic();
      if (c.analytics) {
        loadGA4({ marketing: c.marketing, campaign: getLastTouch(), internal });
        updateGA4Marketing(c.marketing);
        loadClarity({ internal, experiments: getAssignments() });
      }
      if (c.marketing) loadMetaPixel({ fbclid: getLastTouch().fbclid });
      flushPending(c.analytics || c.marketing);
    };
    const unsubscribe = consentStore.subscribe(apply);
    loadConsent();
    return () => {
      unsubscribe();
    };
  }, []);

  // 2) page_view por navegación (evita duplicados por StrictMode o re-render)
  useEffect(() => {
    const key = `${pathname}${window.location.search}`;
    if (lastPage.current === key) return;
    captureAttribution(new URL(window.location.href), document.referrer);
    // Pequeña espera para que el <title> de la nueva ruta ya esté aplicado.
    const t = window.setTimeout(() => {
      if (lastPage.current === key) return;
      lastPage.current = key;
      track("page_view", {
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title,
      });
    }, 60);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return null;
}
