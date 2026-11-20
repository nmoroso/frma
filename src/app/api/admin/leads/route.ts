import { NextResponse } from "next/server";
import { csvCell } from "@/lib/csv";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/server";

const COLUMNS = [
  "created_at",
  "email",
  "interest",
  "origin",
  "source_page",
  "consent",
  "consent_version",
  "consent_at",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "has_fbclid",
  "experiment_id",
  "variant_id",
  "is_internal",
  "unsubscribed_at",
] as const;

/** GET /api/admin/leads — CSV de leads. Solo administradores autenticados. */
export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });

  const includeInternal = new URL(req.url).searchParams.get("internos") === "1";
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from("leads").select(COLUMNS.join(",")).order("created_at", { ascending: true }).range(from, from + 999);
    if (!includeInternal) q = q.eq("is_internal", false);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows.push(...((data ?? []) as unknown as Record<string, unknown>[]));
    if (!data || data.length < 1000) break;
  }

  const csv = [COLUMNS.join(","), ...rows.map((r) => COLUMNS.map((c) => csvCell(r[c])).join(","))].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="frma-leads-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
