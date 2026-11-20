import { randomId, readJSON, writeJSON, removeKey } from "../storage";

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type Attribution = Partial<Record<(typeof UTM_KEYS)[number] | "fbclid", string>> & {
  landing_page?: string;
  referrer?: string;
  captured_at?: string;
};

const FIRST_KEY = "frma_attr_first";
const LAST_KEY = "frma_attr_last";
const SESSION_KEY = "frma_session";
const VISITOR_KEY = "frma_vid";
const INTERNAL_KEY = "frma_internal";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const MAX_LEN = 150;
const clean = (v: string | null) =>
  v ? v.trim().slice(0, MAX_LEN).replace(/[^\p{L}\p{N}\s._\-:/|+~%]/gu, "") : "";

/** Extrae UTMs y fbclid de una query string. Exportada para tests. */
export function parseAttribution(search: string): Attribution {
  const params = new URLSearchParams(search);
  const out: Attribution = {};
  for (const k of UTM_KEYS) {
    const v = clean(params.get(k));
    if (v) out[k] = v;
  }
  const fbclid = clean(params.get("fbclid"));
  if (fbclid) out.fbclid = fbclid;
  return out;
}

export function hasCampaignData(a: Attribution) {
  return Boolean(a.utm_source || a.utm_medium || a.utm_campaign || a.fbclid);
}

/**
 * Se llama en cada carga/navegación. Guarda:
 *  - primer contacto (first touch): solo la primera vez.
 *  - último contacto (last touch): cada vez que llega con UTM/fbclid.
 * No contiene datos personales; queda en el navegador del visitante.
 */
export function captureAttribution(url: URL, referrer: string) {
  const found = parseAttribution(url.search);
  // Tráfico interno: ?frma_internal=1 marca este navegador; ?frma_internal=0 lo desmarca.
  const internal = url.searchParams.get("frma_internal");
  if (internal === "1") writeJSON(INTERNAL_KEY, true);
  if (internal === "0") removeKey(INTERNAL_KEY);

  if (!hasCampaignData(found)) {
    if (!readJSON<Attribution | null>(FIRST_KEY, null)) {
      writeJSON(FIRST_KEY, {
        landing_page: url.pathname,
        referrer: safeReferrer(referrer),
        captured_at: new Date().toISOString(),
      } satisfies Attribution);
    }
    return;
  }
  const record: Attribution = {
    ...found,
    landing_page: url.pathname,
    referrer: safeReferrer(referrer),
    captured_at: new Date().toISOString(),
  };
  const first = readJSON<Attribution | null>(FIRST_KEY, null);
  if (!first || !hasCampaignData(first)) writeJSON(FIRST_KEY, record);
  writeJSON(LAST_KEY, record);
}

function safeReferrer(ref: string) {
  try {
    return ref ? new URL(ref).hostname : "";
  } catch {
    return "";
  }
}

export function getFirstTouch(): Attribution {
  return readJSON<Attribution>(FIRST_KEY, {});
}

export function getLastTouch(): Attribution {
  return readJSON<Attribution | null>(LAST_KEY, null) ?? getFirstTouch();
}

/** Identificador anónimo del navegador (no es un dato personal identificable). */
export function getVisitorId(): string {
  let id = readJSON<string | null>(VISITOR_KEY, null);
  if (!id) {
    id = randomId();
    writeJSON(VISITOR_KEY, id);
  }
  return id;
}

/** Sesión anónima: expira tras 30 minutos de inactividad. */
export function getSessionId(): string {
  const now = Date.now();
  const s = readJSON<{ id: string; last: number } | null>(SESSION_KEY, null);
  const id = s && now - s.last < SESSION_TIMEOUT_MS ? s.id : randomId();
  writeJSON(SESSION_KEY, { id, last: now });
  return id;
}

export function isInternalTraffic(): boolean {
  if (typeof window === "undefined") return false;
  if (readJSON<boolean>(INTERNAL_KEY, false)) return true;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return true;
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
  if (vercelEnv && vercelEnv !== "production") return true;
  return false;
}
