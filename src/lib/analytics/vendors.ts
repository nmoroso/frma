/**
 * Carga de scripts de terceros. SOLO se llaman después del consentimiento.
 * Si falta un ID (o tiene formato inválido) la plataforma simplemente no se carga.
 */
import type { Attribution } from "./attribution";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
    _fbq?: unknown;
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
    frmaEventLog?: { name: string; at: string; sent: string[]; pendingConsent?: boolean }[];
  }
}

export const IDS = {
  ga4: (process.env.NEXT_PUBLIC_GA4_ID || "").trim(),
  metaPixel: (process.env.NEXT_PUBLIC_META_PIXEL_ID || "").trim(),
  clarity: (process.env.NEXT_PUBLIC_CLARITY_ID || "").trim(),
};

export const DEBUG = process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true";

export const VALID = {
  ga4: /^G-[A-Z0-9]{4,20}$/.test(IDS.ga4),
  metaPixel: /^\d{8,20}$/.test(IDS.metaPixel),
  clarity: /^[a-z0-9]{6,20}$/i.test(IDS.clarity),
};

const loaded = { ga4: false, metaPixel: false, clarity: false };
export const isLoaded = (k: keyof typeof loaded) => loaded[k];
export const anyLoaded = () => loaded.ga4 || loaded.metaPixel || loaded.clarity;

function inject(src: string) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

export function loadGA4(opts: { marketing: boolean; campaign: Attribution; internal: boolean }) {
  if (loaded.ga4 || !VALID.ga4) return false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag necesita el objeto `arguments` original.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: opts.marketing ? "granted" : "denied",
    ad_user_data: opts.marketing ? "granted" : "denied",
    ad_personalization: opts.marketing ? "granted" : "denied",
  });
  window.gtag("js", new Date());
  const c = opts.campaign;
  window.gtag("config", IDS.ga4, {
    send_page_view: false, // los page_view los envía PageViewTracker (evita duplicados)
    ...(DEBUG ? { debug_mode: true } : {}),
    ...(opts.internal ? { traffic_type: "internal" } : {}),
    // Si el script cargó después de que el usuario navegó (consentimiento tardío),
    // recuperamos la campaña original para no perder la atribución.
    ...(c.utm_source ? { campaign_source: c.utm_source } : {}),
    ...(c.utm_medium ? { campaign_medium: c.utm_medium } : {}),
    ...(c.utm_campaign ? { campaign_name: c.utm_campaign } : {}),
    ...(c.utm_content ? { campaign_content: c.utm_content } : {}),
    ...(c.utm_term ? { campaign_term: c.utm_term } : {}),
  });
  inject(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(IDS.ga4)}`);
  loaded.ga4 = true;
  return true;
}

export function updateGA4Marketing(marketing: boolean) {
  if (!loaded.ga4 || !window.gtag) return;
  const v = marketing ? "granted" : "denied";
  window.gtag("consent", "update", { ad_storage: v, ad_user_data: v, ad_personalization: v });
}

export function loadMetaPixel(opts: { fbclid?: string }) {
  if (loaded.metaPixel || !VALID.metaPixel) return false;
  // Si el visitante llegó con fbclid antes de aceptar, recreamos la cookie _fbc
  // con el formato oficial para no perder la atribución del anuncio.
  if (opts.fbclid && !document.cookie.includes("_fbc=")) {
    const maxAge = 90 * 24 * 3600;
    document.cookie = `_fbc=fb.1.${Date.now()}.${opts.fbclid}; Max-Age=${maxAge}; path=/; SameSite=Lax`;
  }
  /* Snippet oficial de Meta, sin el PageView automático. */
  const n = function (...args: unknown[]) {
    if (n.callMethod) (n.callMethod as (...a: unknown[]) => void)(...args);
    else n.queue!.push(args);
  } as NonNullable<Window["fbq"]>;
  if (!window._fbq) window._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  window.fbq = n;
  inject("https://connect.facebook.net/en_US/fbevents.js");
  window.fbq("set", "autoConfig", false, IDS.metaPixel); // sin eventos automáticos
  window.fbq("init", IDS.metaPixel);
  loaded.metaPixel = true;
  return true;
}

export function loadClarity(opts: { internal: boolean; experiments: Record<string, string> }) {
  if (loaded.clarity || !VALID.clarity) return false;
  const c = function (...args: unknown[]) {
    (c.q = c.q || []).push(args);
  } as NonNullable<Window["clarity"]>;
  window.clarity = window.clarity || c;
  inject(`https://www.clarity.ms/tag/${encodeURIComponent(IDS.clarity)}`);
  window.clarity("consent");
  window.clarity("set", "traffic_type", opts.internal ? "internal" : "real");
  for (const [id, variant] of Object.entries(opts.experiments)) window.clarity("set", id, variant);
  loaded.clarity = true;
  return true;
}
