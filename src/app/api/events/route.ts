import { NextResponse } from "next/server";
import { EVENT_NAMES, type EventName } from "@/lib/analytics/events";
import { clientKey, rateLimit, sameOrigin } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * POST /api/events — medición propia del embudo (solo con consentimiento de analítica).
 * Guarda eventos anónimos; si Supabase no está configurado responde 204 y no hace nada.
 */
const ALLOWED = new Set<string>(EVENT_NAMES);
const s = (v: unknown, max = 150) => (typeof v === "string" && v ? v.slice(0, max) : null);

export async function POST(req: Request) {
  if (!sameOrigin(req)) return new NextResponse(null, { status: 403 });
  if (!rateLimit(`ev:${clientKey(req)}`, 300, 10 * 60 * 1000)) return new NextResponse(null, { status: 429 });

  const db = supabaseAdmin();
  if (!db) return new NextResponse(null, { status: 204 });

  const text = await req.text();
  if (text.length > 8000) return new NextResponse(null, { status: 413 });
  let b: Record<string, unknown>;
  try {
    b = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const name = s(b.event_name, 40);
  const session = s(b.session_id, 64);
  const visitor = s(b.visitor_id, 64);
  if (!name || !ALLOWED.has(name) || !session || !visitor) return new NextResponse(null, { status: 400 });

  const items = Array.isArray(b.items)
    ? b.items.slice(0, 20).map((raw) => {
        const i = (raw ?? {}) as Record<string, unknown>;
        return {
          id: s(i.id, 60),
          type: i.type === "capsula" ? "capsula" : "prenda_individual",
          variant: s(i.variant, 80),
          price: Number.isFinite(Number(i.price)) ? Math.round(Number(i.price)) : null,
          qty: Number.isFinite(Number(i.qty)) ? Math.min(99, Math.max(0, Math.round(Number(i.qty)))) : 1,
        };
      })
    : [];
  const value = Number(b.value);

  const { error } = await db.from("funnel_events").insert({
    event_name: name as EventName,
    session_id: session,
    visitor_id: visitor,
    page_path: s(b.page_path, 200),
    items,
    value: Number.isFinite(value) ? Math.round(value) : null,
    lead_interest: s(b.lead_interest, 200),
    utm_source: s(b.utm_source),
    utm_medium: s(b.utm_medium),
    utm_campaign: s(b.utm_campaign),
    utm_content: s(b.utm_content),
    utm_term: s(b.utm_term),
    has_fbclid: b.has_fbclid === true,
    experiment_id: s(b.experiment_id, 120),
    variant_id: s(b.variant_id, 120),
    is_internal: b.is_internal === true,
  });
  if (error) console.error("[events]", error.message);
  return new NextResponse(null, { status: 204 });
}
