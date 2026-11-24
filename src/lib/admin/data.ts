import "server-only";
import { supabaseAdmin } from "../supabase/admin";
import { loadCatalogFromDb, publicUrl, type MediaRow } from "../catalog/db";
import type { Catalog, MediaKind } from "../catalog/types";

/** Foto tal como la ve el panel (incluye dónde se usa). */
export type MediaItem = {
  id: string;
  url: string;
  alt: string;
  kind: MediaKind;
  isAi: boolean;
  width: number | null;
  height: number | null;
  bytes: number | null;
  originalName: string | null;
  createdAt: string;
  tags: { productId: string; variantId: string | null }[];
  usage: string[];
};

export type ModelItem = {
  id: string;
  name: string;
  age: number | null;
  notes: string;
  referenceMediaId: string | null;
  mediaIds: string[];
  sortOrder: number;
};

export function toMediaItem(m: MediaRow, tags: MediaItem["tags"] = [], usage: string[] = []): MediaItem {
  return {
    id: m.id,
    url: publicUrl(m.storage_path),
    alt: m.alt,
    kind: m.kind,
    isAi: m.is_ai,
    width: m.width,
    height: m.height,
    bytes: m.bytes,
    originalName: m.original_name,
    createdAt: m.created_at,
    tags,
    usage,
  };
}

export class SupabaseMissingError extends Error {}

function db() {
  const client = supabaseAdmin();
  if (!client) throw new SupabaseMissingError("Supabase no está configurado.");
  return client;
}

/** Catálogo completo para el panel (incluye borradores y colores inactivos). */
export async function loadAdminCatalog(): Promise<Catalog> {
  const { totalProducts: _total, ...c } = await loadCatalogFromDb(db(), true);
  void _total;
  return c;
}

/** Biblioteca de imágenes con etiquetas de prendas y usos. */
export async function loadMediaLibrary(): Promise<MediaItem[]> {
  const client = db();
  const q = async <T,>(table: string, cols = "*") => {
    const { data, error } = await client.from(table).select(cols);
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data ?? []) as T[];
  };
  const [media, tags, vm, mm, cm, home, products, variants, models, collections] = await Promise.all([
    client.from("media").select("*").order("created_at", { ascending: false }).then((r) => {
      if (r.error) throw new Error(r.error.message);
      return (r.data ?? []) as MediaRow[];
    }),
    q<{ media_id: string; product_id: string; variant_id: string | null }>("media_products"),
    q<{ media_id: string; variant_id: string }>("variant_media"),
    q<{ media_id: string; model_id: string }>("model_media"),
    q<{ media_id: string; collection_id: string }>("collection_media"),
    q<{ media_id: string; section: string }>("home_images"),
    q<{ id: string; name: string }>("products", "id,name"),
    q<{ id: string; product_id: string; color_name: string }>("product_variants", "id,product_id,color_name"),
    q<{ id: string; name: string; reference_media_id: string | null }>("models", "id,name,reference_media_id"),
    q<{ id: string; name: string; hero_media_id: string | null }>("collections", "id,name,hero_media_id"),
  ]);
  const pName = new Map(products.map((p) => [p.id, p.name]));
  const vById = new Map(variants.map((v) => [v.id, v]));
  const mName = new Map(models.map((m) => [m.id, m.name]));
  const cName = new Map(collections.map((c) => [c.id, c.name]));
  const SECTION: Record<string, string> = { hero: "Portada", banner: "Banner", wardrobe: "Guardarropa del inicio", editorial: "Editorial", featured: "Destacados" };

  return media.map((m) => {
    const usage: string[] = [];
    for (const j of vm.filter((x) => x.media_id === m.id)) {
      const v = vById.get(j.variant_id);
      if (v) usage.push(`${pName.get(v.product_id) ?? v.product_id} · ${v.color_name}`);
    }
    for (const j of mm.filter((x) => x.media_id === m.id)) usage.push(`Modelo: ${mName.get(j.model_id) ?? ""}`);
    for (const md of models.filter((x) => x.reference_media_id === m.id)) usage.push(`Foto de referencia: ${md.name}`);
    for (const j of cm.filter((x) => x.media_id === m.id)) usage.push(`Guardarropa: ${cName.get(j.collection_id) ?? j.collection_id}`);
    for (const c of collections.filter((x) => x.hero_media_id === m.id)) usage.push(`Portada de guardarropa: ${c.name}`);
    for (const h of home.filter((x) => x.media_id === m.id)) {
      const label = h.section.startsWith("category:") ? `Categoría ${h.section.slice(9)}` : SECTION[h.section] ?? h.section;
      usage.push(`Inicio: ${label}`);
    }
    const t = tags.filter((x) => x.media_id === m.id).map((x) => ({ productId: x.product_id, variantId: x.variant_id }));
    return toMediaItem(m, t, [...new Set(usage)]);
  });
}

export async function loadModels(): Promise<ModelItem[]> {
  const client = db();
  const [{ data: models, error }, { data: links, error: e2 }] = await Promise.all([
    client.from("models").select("*").order("sort_order").order("created_at"),
    client.from("model_media").select("*").order("sort_order"),
  ]);
  if (error || e2) throw new Error((error ?? e2)!.message);
  return (models ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    age: m.age,
    notes: m.notes,
    referenceMediaId: m.reference_media_id,
    sortOrder: m.sort_order,
    mediaIds: (links ?? []).filter((l) => l.model_id === m.id).map((l) => l.media_id),
  }));
}

export async function loadHomeRows() {
  const { data, error } = await db().from("home_images").select("*").order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; section: string; media_id: string; title: string; subtitle: string; href: string; sort_order: number }[];
}

/** Ids de variante (uuid) por producto+slug, para el editor de guardarropas. */
export async function loadVariantIndex() {
  const { data, error } = await db().from("product_variants").select("id,product_id,slug");
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; product_id: string; slug: string }[];
}
