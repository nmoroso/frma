/**
 * Validación de leads (se usa en el servidor; también exportada para tests).
 */
import { CAPSULE, PRODUCTS } from "@/config/catalog";

export const INTEREST_OPTIONS = [
  { id: "general", label: "Todo FRMA" },
  { id: CAPSULE.id, label: CAPSULE.name },
  ...PRODUCTS.map((p) => ({ id: p.id, label: p.name })),
];
const INTEREST_IDS = new Set(INTEREST_OPTIONS.map((o) => o.id));

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const MIN_FILL_MS = 1500;
const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export type LeadInput = {
  email: string;
  consent: boolean;
  interest: string[];
  source_page: string;
  origin: string;
  session_id?: string;
  visitor_id?: string;
  experiment_id?: string;
  variant_id?: string;
  is_internal: boolean;
  has_fbclid: boolean;
} & Partial<Record<(typeof UTM_FIELDS)[number], string>>;

export type ValidationResult =
  | { ok: true; lead: LeadInput }
  | { ok: false; reason: "invalid_email" | "no_consent" | "spam" | "bad_request" };

const str = (v: unknown, max = 150) =>
  typeof v === "string" ? v.trim().slice(0, max).replace(/[\u0000-\u001f<>]/g, "") : "";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateLead(body: unknown, now = Date.now()): ValidationResult {
  if (!body || typeof body !== "object") return { ok: false, reason: "bad_request" };
  const b = body as Record<string, unknown>;

  // Anti-spam: campo trampa (los humanos no lo ven) y tiempo mínimo de llenado.
  if (str(b.website)) return { ok: false, reason: "spam" };
  const started = Number(b.started_at);
  if (!Number.isFinite(started) || now - started < MIN_FILL_MS || now - started > 1000 * 60 * 60 * 24) {
    return { ok: false, reason: "spam" };
  }

  const email = normalizeEmail(typeof b.email === "string" ? b.email : "");
  if (email.length < 6 || email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, reason: "invalid_email" };
  if (b.consent !== true) return { ok: false, reason: "no_consent" };

  const rawInterest = Array.isArray(b.interest) ? b.interest : [b.interest];
  const interest = [...new Set(rawInterest.map((i) => str(i, 40)).filter((i) => INTEREST_IDS.has(i)))];

  const lead: LeadInput = {
    email,
    consent: true,
    interest: interest.length ? interest : ["general"],
    source_page: str(b.source_page, 200) || "/",
    origin: str(b.origin, 40) || "directo",
    session_id: str(b.session_id, 64) || undefined,
    visitor_id: str(b.visitor_id, 64) || undefined,
    experiment_id: str(b.experiment_id, 120) || undefined,
    variant_id: str(b.variant_id, 120) || undefined,
    is_internal: b.is_internal === true,
    has_fbclid: b.has_fbclid === true,
  };
  for (const f of UTM_FIELDS) {
    const v = str(b[f]);
    if (v) lead[f] = v;
  }
  return { ok: true, lead };
}
