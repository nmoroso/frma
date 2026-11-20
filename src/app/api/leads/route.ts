import { NextResponse } from "next/server";
import { SITE } from "@/config/site";
import { clientKey, rateLimit, sameOrigin } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validateLead } from "@/lib/leads/validate";

/**
 * POST /api/leads — registra un correo interesado.
 * Respuestas: { status: "created" | "duplicate" } o error.
 * No guarda IP, nombre ni datos de pago.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ status: "error" }, { status: 403 });
  if (!rateLimit(`lead:${clientKey(req)}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ status: "error", message: "Demasiados intentos. Prueba en unos minutos." }, { status: 429 });
  }

  const text = await req.text();
  if (text.length > 5000) return NextResponse.json({ status: "error" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ status: "error" }, { status: 400 });
  }

  const result = validateLead(body);
  if (!result.ok) {
    if (result.reason === "spam") {
      // Respuesta neutra para no dar pistas a bots. No se guarda nada.
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }
    const message =
      result.reason === "invalid_email"
        ? "Ingresa un correo válido."
        : result.reason === "no_consent"
          ? "Necesitamos tu autorización para guardar tu correo."
          : "Solicitud inválida.";
    return NextResponse.json({ status: "error", message }, { status: 400 });
  }

  const db = supabaseAdmin();
  if (!db) {
    console.warn("[leads] Supabase no configurado: el lead NO se guardó.");
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }

  const { lead } = result;
  const { data, error } = await db
    .from("leads")
    .upsert(
      {
        email: lead.email,
        email_normalized: lead.email,
        interest: lead.interest,
        origin: lead.origin,
        source_page: lead.source_page,
        consent: true,
        consent_version: SITE.leadConsentVersion,
        utm_source: lead.utm_source ?? null,
        utm_medium: lead.utm_medium ?? null,
        utm_campaign: lead.utm_campaign ?? null,
        utm_content: lead.utm_content ?? null,
        utm_term: lead.utm_term ?? null,
        has_fbclid: lead.has_fbclid,
        session_id: lead.session_id ?? null,
        visitor_id: lead.visitor_id ?? null,
        experiment_id: lead.experiment_id ?? null,
        variant_id: lead.variant_id ?? null,
        is_internal: lead.is_internal,
      },
      { onConflict: "email_normalized", ignoreDuplicates: true },
    )
    .select("id");

  if (error) {
    console.error("[leads] error al guardar:", error.message);
    return NextResponse.json({ status: "error", message: "No pudimos registrar tu correo. Inténtalo de nuevo." }, { status: 500 });
  }
  return NextResponse.json({ status: data && data.length > 0 ? "created" : "duplicate" });
}
