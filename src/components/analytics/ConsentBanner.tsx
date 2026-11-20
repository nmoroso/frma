"use client";

import Link from "next/link";
import { useState } from "react";
import { clearTrackingCookies, preferencesOpenStore, saveConsent } from "@/lib/analytics/consent";
import { anyLoaded } from "@/lib/analytics/vendors";
import { useConsent, usePreferencesOpen } from "@/lib/hooks";

export function ConsentBanner() {
  const consent = useConsent();
  const open = usePreferencesOpen();
  if (!(consent === null || open)) return null;
  // `key` reinicia el estado del panel cada vez que se abre desde "Preferencias de cookies".
  return (
    <ConsentPanel
      key={open ? "prefs" : "banner"}
      reopened={open}
      hasDecision={Boolean(consent)}
      initialAnalytics={Boolean(consent?.analytics)}
      initialMarketing={Boolean(consent?.marketing)}
    />
  );
}

function ConsentPanel(props: { reopened: boolean; hasDecision: boolean; initialAnalytics: boolean; initialMarketing: boolean }) {
  const [custom, setCustom] = useState(props.reopened);
  const [analytics, setAnalytics] = useState(props.initialAnalytics);
  const [marketing, setMarketing] = useState(props.initialMarketing);

  const decide = (a: boolean, m: boolean) => {
    const wasLoaded = anyLoaded();
    const { revoked } = saveConsent(a, m);
    setCustom(false);
    if (revoked) {
      clearTrackingCookies();
      // Los scripts ya cargados no se pueden "descargar": recargamos para detenerlos.
      if (wasLoaded) window.location.reload();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-6"
    >
      <div className="mx-auto max-w-2xl border border-line bg-paper p-5 shadow-[0_8px_40px_rgba(0,0,0,0.08)] sm:p-6">
        <p id="consent-title" className="text-sm font-medium tracking-wide">
          Cookies y medición
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Usamos cookies necesarias para que el sitio funcione (por ejemplo, tu carrito). Con tu
          permiso, también usamos herramientas de analítica (Google Analytics, Microsoft Clarity) y
          de publicidad (Meta) para entender cómo se usa el sitio. No se activan hasta que aceptes.{" "}
          <Link href="/privacidad#cookies" className="underline underline-offset-2">
            Más información
          </Link>
          .
        </p>

        {custom && (
          <div className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
            <Toggle label="Necesarias" description="Carrito y preferencias. Siempre activas." checked disabled />
            <Toggle
              label="Analítica"
              description="Google Analytics 4, Microsoft Clarity y medición propia de visitas."
              checked={analytics}
              onChange={setAnalytics}
            />
            <Toggle
              label="Publicidad"
              description="Meta Pixel, para medir el rendimiento de anuncios en Instagram y Facebook."
              checked={marketing}
              onChange={setMarketing}
            />
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {custom ? (
            <button className="btn-primary" onClick={() => decide(analytics, marketing)}>
              Guardar preferencias
            </button>
          ) : (
            <>
              <button className="btn-secondary" onClick={() => setCustom(true)}>
                Configurar
              </button>
              <button className="btn-secondary" onClick={() => decide(false, false)}>
                Rechazar
              </button>
              <button className="btn-primary" onClick={() => decide(true, true)}>
                Aceptar todo
              </button>
            </>
          )}
          {props.reopened && props.hasDecision && (
            <button className="btn-ghost" onClick={() => preferencesOpenStore.set(false)}>
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle(props: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block font-medium">{props.label}</span>
        <span className="block text-muted">{props.description}</span>
      </span>
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 shrink-0 accent-ink"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange?.(e.target.checked)}
      />
    </label>
  );
}

export function CookiePreferencesButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => preferencesOpenStore.set(true)}>
      Preferencias de cookies
    </button>
  );
}
