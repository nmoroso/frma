import "server-only";
import type { ServerDb } from "./supabase/admin";
import type { EventRow, LeadRow } from "./metrics";

const PAGE = 1000;
const MAX_ROWS = 100_000;

async function fetchAll<T>(db: ServerDb, table: string, columns: string, since: string | null): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    let q = db.from(table).select(columns).order("created_at", { ascending: true }).range(from, from + PAGE - 1);
    if (since) q = q.gte("created_at", since);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

export function fetchEvents(db: ServerDb, since: string | null) {
  return fetchAll<EventRow>(
    db,
    "funnel_events",
    "created_at,event_name,session_id,visitor_id,items,value,utm_source,utm_campaign,experiment_id,variant_id,is_internal",
    since,
  );
}

export function fetchLeads(db: ServerDb, since: string | null) {
  return fetchAll<LeadRow>(db, "leads", "created_at,interest,utm_source,utm_campaign,variant_id,is_internal", since);
}
