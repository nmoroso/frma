"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SITE } from "@/config/site";
import { getAssignments, experimentParams } from "@/lib/experiments";
import { getLastTouch, getSessionId, getVisitorId, isInternalTraffic } from "@/lib/analytics/attribution";
import { track } from "@/lib/analytics/track";
import { INTEREST_OPTIONS } from "@/lib/leads/validate";

type Status = "idle" | "sending" | "created" | "duplicate" | "error" | "unavailable";

export function LeadForm({ defaultInterest = [], origin = "directo" }: { defaultInterest?: string[]; origin?: string }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [interest, setInterest] = useState<string>(defaultInterest[0] ?? "general");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now(); // momento en que el formulario se mostró (anti-spam)
  }, []);
  const honeypot = useRef<HTMLInputElement>(null);

  const interests = defaultInterest.length > 1 ? defaultInterest : [interest];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S{2,}$/.test(email.trim())) {
      setError("Ingresa un correo válido.");
      return;
    }
    if (!consent) {
      setError("Necesitamos tu autorización para guardar tu correo.");
      return;
    }
    setStatus("sending");
    const last = getLastTouch();
    const exp = experimentParams(getAssignments());
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          consent,
          interest: interests,
          origin,
          source_page: window.location.pathname,
          website: honeypot.current?.value ?? "",
          started_at: startedAt.current,
          session_id: getSessionId(),
          visitor_id: getVisitorId(),
          utm_source: last.utm_source,
          utm_medium: last.utm_medium,
          utm_campaign: last.utm_campaign,
          utm_content: last.utm_content,
          utm_term: last.utm_term,
          has_fbclid: Boolean(last.fbclid),
          is_internal: isInternalTraffic(),
          ...exp,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { status?: string; message?: string };
      if (res.ok && data.status === "created") {
        setStatus("created");
        // Solo aquí se registra el lead (nunca con el correo).
        track("generate_lead", { lead_interest: interests.join(",") });
      } else if (res.ok && data.status === "duplicate") {
        setStatus("duplicate");
      } else if (res.status === 503) {
        setStatus("unavailable");
      } else {
        setStatus("error");
        setError(data.message || "No pudimos registrar tu correo. Inténtalo de nuevo.");
      }
    } catch {
      setStatus("error");
      setError("Sin conexión. Inténtalo de nuevo.");
    }
  };

  if (status === "created" || status === "duplicate") {
    return (
      <div className="border border-line bg-paper p-6" role="status">
        <p className="text-lg font-light">{status === "created" ? "¡Listo! Te avisaremos." : "Ya estabas en la lista."}</p>
        <p className="mt-2 text-sm text-muted">
          {status === "created"
            ? "Te escribiremos cuando FRMA abra sus pedidos. Puedes darte de baja cuando quieras."
            : "Tu correo ya estaba registrado. Te avisaremos del lanzamiento."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <label htmlFor="lead-email" className="text-sm">Correo electrónico</label>
        <input
          id="lead-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={254}
          className="field mt-2"
          placeholder="tu@correo.cl"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {defaultInterest.length <= 1 && (
        <div>
          <label htmlFor="lead-interest" className="text-sm">Me interesa</label>
          <select id="lead-interest" className="field mt-2" value={interest} onChange={(e) => setInterest(e.target.value)}>
            {INTEREST_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
      )}
      {/* Campo trampa anti-spam: invisible para personas */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="lead-website">No completar</label>
        <input id="lead-website" ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 accent-ink"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
        />
        <span>
          {SITE.leadConsentText}{" "}
          <Link href="/privacidad" className="link-underline">Política de privacidad</Link>.
        </span>
      </label>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      {status === "unavailable" && (
        <p className="text-sm text-red-700" role="alert">
          El registro aún no está habilitado. Escríbenos a {SITE.contactEmail}.
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={status === "sending"}>
        {status === "sending" ? "Enviando…" : "Avísenme del lanzamiento"}
      </button>
    </form>
  );
}
