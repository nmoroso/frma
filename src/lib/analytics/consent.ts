import { createStore, readJSON, writeJSON } from "../storage";

/**
 * Consentimiento de cookies.
 *  - necessary: carrito, preferencias, atribución propia (siempre activas).
 *  - analytics: Google Analytics 4, Microsoft Clarity y medición propia del embudo.
 *  - marketing: Meta Pixel.
 */
export type Consent = {
  version: number;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

export const CONSENT_VERSION = 1;
const KEY = "frma_consent";

/** `undefined` = todavía no lo sabemos (SSR); `null` = el usuario no ha decidido. */
export const consentStore = createStore<Consent | null | undefined>(undefined);
export const preferencesOpenStore = createStore(false);

export function loadConsent() {
  const stored = readJSON<Consent | null>(KEY, null);
  consentStore.set(stored && stored.version === CONSENT_VERSION ? stored : null);
}

export function saveConsent(analytics: boolean, marketing: boolean) {
  const prev = consentStore.get();
  const next: Consent = {
    version: CONSENT_VERSION,
    analytics,
    marketing,
    updatedAt: new Date().toISOString(),
  };
  writeJSON(KEY, next);
  consentStore.set(next);
  preferencesOpenStore.set(false);
  const revoked =
    (prev?.analytics && !analytics) || (prev?.marketing && !marketing);
  return { revoked: Boolean(revoked) };
}

export function hasAnalyticsConsent() {
  return consentStore.get()?.analytics === true;
}

export function hasMarketingConsent() {
  return consentStore.get()?.marketing === true;
}

/** Borra cookies de terceros ya escritas al retirar el consentimiento. */
export function clearTrackingCookies() {
  if (typeof document === "undefined") return;
  const names = document.cookie.split(";").map((c) => c.split("=")[0].trim());
  const targets = names.filter((n) => /^(_ga|_gid|_gat|_fbp|_fbc|_clck|_clsk|CLID|MUID|ANONCHK|SM)/.test(n));
  const host = window.location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const name of targets) {
    for (const d of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ""}`;
    }
  }
}
