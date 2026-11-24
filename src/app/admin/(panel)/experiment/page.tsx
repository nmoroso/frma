import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCatalog } from "@/lib/catalog/server";
import { ACTIVE_EXPERIMENTS } from "@/config/experiments";
import { PRICES_VALIDATED } from "@/config/pricing";
import { fetchEvents, fetchLeads } from "@/lib/admin-data";
import { computeMetrics, type Metrics, type TrafficFilter } from "@/lib/metrics";
import { formatCLP } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/server";
import { LogoutButton } from "../../login/LoginForm";

export const metadata: Metadata = { title: "Experimento", robots: { index: false, follow: false } };

const RANGES = { "7": 7, "30": 30, "90": 90, todo: null } as const;

export default function ExperimentPage({ searchParams }: PageProps<"/admin/experiment">) {
  return (
    <Suspense fallback={<div className="container-frma py-16 text-sm text-muted">Cargando datos…</div>}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/admin/experiment">["searchParams"] }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  const sp = await searchParams;
  const traffic = (["real", "interno", "todo"].includes(String(sp.trafico)) ? sp.trafico : "real") as TrafficFilter;
  const rangeKey = (String(sp.rango) in RANGES ? String(sp.rango) : "30") as keyof typeof RANGES;
  const days = RANGES[rangeKey];

  const db = supabaseAdmin();
  if (!db) {
    return (
      <Shell email={admin.email}>
        <Notice>Falta <code>SUPABASE_SERVICE_ROLE_KEY</code> en las variables de entorno. Ver README, paso Supabase.</Notice>
      </Shell>
    );
  }

  const since = sinceDays(days);
  let metrics: Metrics;
  let truncated = false;
  try {
    const [ev, ld] = await Promise.all([fetchEvents(db, since), fetchLeads(db, since)]);
    truncated = ev.truncated || ld.truncated;
    metrics = computeMetrics(ev.rows, ld.rows, traffic);
  } catch (e) {
    return (
      <Shell email={admin.email}>
        <Notice>
          No se pudieron leer los datos: {(e as Error).message}. ¿Ejecutaste <code>supabase/schema.sql</code>?
        </Notice>
      </Shell>
    );
  }

  const q = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ trafico: traffic, rango: rangeKey, ...patch });
    return `/admin/experiment?${p}`;
  };
  const catalog = await getCatalog();
  const name = (id: string) => catalog.collections.find((c) => c.id === id)?.name ?? catalog.products.find((p) => p.id === id)?.name ?? id;
  const empty = metrics.eventsCount === 0 && metrics.leadsConfirmed === 0;

  return (
    <Shell email={admin.email}>
      <div className="flex flex-wrap gap-6 text-sm">
        <Seg label="Tráfico" options={[["real", "Real"], ["interno", "Interno / pruebas"], ["todo", "Todo"]]} current={traffic} href={(v) => q({ trafico: v })} />
        <Seg label="Periodo" options={[["7", "7 días"], ["30", "30 días"], ["90", "90 días"], ["todo", "Todo"]]} current={rangeKey} href={(v) => q({ rango: v })} />
      </div>

      <div className="mt-6 space-y-2 text-xs text-muted">
        <p>
          Fuente: tabla <code>funnel_events</code> (solo visitantes que aceptaron cookies de analítica) y tabla{" "}
          <code>leads</code> (registros con consentimiento explícito). Las cifras de GA4 pueden diferir: revisa también el
          dashboard de Looker Studio (docs/GUIA-INTEGRACIONES.md).
        </p>
        <p>
          Excluido del filtro actual: {metrics.internalEvents} eventos y {metrics.internalLeads} leads marcados como internos en el periodo.
          {truncated && " ⚠️ Se alcanzó el máximo de filas leídas: acota el periodo."}
        </p>
        {!PRICES_VALIDATED && <p>⚠️ Los precios del sitio aún no están validados (src/config/pricing.ts).</p>}
      </div>

      {empty ? (
        <Notice>Aún no hay datos registrados para este filtro. Las métricas aparecerán aquí cuando lleguen visitas reales.</Notice>
      ) : (
        <>
          <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Visitantes únicos" value={metrics.visitors} />
            <Kpi label="Sesiones" value={metrics.sessions} />
            <Kpi label="Intenciones de compra" value={metrics.funnel.find((s) => s.id === "purchase_intent")!.sessions} />
            <Kpi label="Leads confirmados" value={metrics.leadsConfirmed} hint={metrics.leadsRate !== null ? `${fmtPct(metrics.leadsRate)} de las sesiones` : undefined} />
          </section>

          <Section title="Embudo (sesiones que alcanzaron cada etapa)">
            <div className="space-y-3">
              {metrics.funnel.map((s) => {
                const max = metrics.funnel[0].sessions || 1;
                return (
                  <div key={s.id} className="grid grid-cols-[150px_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[220px_1fr_160px]">
                    <span>{s.label}</span>
                    <div className="h-6 bg-stone">
                      <div className="h-full bg-ink" style={{ width: `${Math.max(1, (s.sessions / max) * 100)}%` }} />
                    </div>
                    <span className="tabular-nums text-right">
                      {s.sessions}
                      {s.rateFromPrev !== null && <span className="ml-2 text-muted">{fmtPct(s.rateFromPrev)} vs. anterior</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Por fuente / campaña">
            <Table
              head={["Fuente / campaña", "Sesiones", "Vieron producto", "Carrito", "Checkout", "Intención", "Leads", "Intención / sesión"]}
              rows={metrics.campaigns.map((c) => [c.name, c.sessions, c.viewItem, c.addToCart, c.beginCheckout, c.purchaseIntent, c.leads, c.sessions ? fmtPct(c.purchaseIntent / c.sessions) : "—"])}
            />
          </Section>

          <Section title="Por producto / cápsula">
            <Table
              head={["Producto", "Tipo", "Sesiones que lo vieron", "Sesiones que lo agregaron", "Unidades agregadas", "Vista → carrito", "Checkout", "Intención (sesiones)", "Valor intención", "Leads interesados"]}
              rows={metrics.products.map((p) => [
                name(p.id),
                p.type === "capsula" ? "Cápsula" : "Prenda",
                p.viewSessions,
                p.addSessions,
                p.addUnits,
                p.viewToAdd !== null ? fmtPct(p.viewToAdd) : "—",
                p.checkoutSessions,
                p.intentSessions,
                formatCLP(p.intentValue),
                p.leadsInterested,
              ])}
            />
          </Section>

          <Section title="Preferencia por color">
            <Table
              head={["Producto", "Color", "Sesiones que eligieron el color", "Unidades agregadas al carrito", "Unidades en intención de compra"]}
              rows={metrics.colors.map((c) => [name(c.productId), c.color, c.selectSessions, c.addUnits, c.intentUnits])}
            />
          </Section>

          <Section title="Experimentos A/B">
            {ACTIVE_EXPERIMENTS.length === 0 && metrics.variants.length === 0 ? (
              <p className="text-sm text-muted">No hay experimentos activos (src/config/experiments.ts).</p>
            ) : (
              <Table
                head={["Experimento → variante", "Sesiones", "Carrito", "Intención", "Intención / sesión"]}
                rows={metrics.variants.map((v) => [v.name, v.sessions, v.addToCart, v.purchaseIntent, v.intentRate !== null ? fmtPct(v.intentRate) : "—"])}
              />
            )}
          </Section>
        </>
      )}

      <Section title="Leads">
        <div className="flex flex-wrap gap-3">
          <a className="btn-secondary" href="/api/admin/leads">Descargar CSV (tráfico real)</a>
          <a className="btn-ghost" href="/api/admin/leads?internos=1">CSV incluyendo internos</a>
        </div>
        <p className="mt-3 text-xs text-muted">El CSV contiene correos: guárdalo en un lugar seguro y no lo compartas.</p>
      </Section>
    </Shell>
  );
}

function Shell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className="container-frma py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="h2">Smoke test · Resultados</h1>
          <p className="mt-1 text-xs text-muted">Sesión: {email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="btn-ghost">Ver sitio</Link>
          <LogoutButton />
        </div>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="mt-8 border border-line bg-ivory p-6 text-sm">{children}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.14em]">{title}</h2>
      {children}
    </section>
  );
}

function Kpi({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="border border-line p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-3xl font-light tabular-nums">{value.toLocaleString("es-CL")}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) return <p className="text-sm text-muted">Sin datos.</p>;
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-ivory text-xs text-muted">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2 font-normal">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className={`px-3 py-2 ${j > 0 ? "tabular-nums" : ""}`}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Seg({ label, options, current, href }: { label: string; options: [string, string][]; current: string; href: (v: string) => string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="eyebrow">{label}</span>
      {options.map(([v, l]) => (
        <Link key={v} href={href(v)} className={`chip min-h-9 ${current === v ? "chip-active" : ""}`}>{l}</Link>
      ))}
    </div>
  );
}

/** Fecha de inicio del periodo (la página se renderiza en cada petición: lee cookies). */
function sinceDays(days: number | null) {
  return days ? new Date(Date.now() - days * 86400_000).toISOString() : null;
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}
