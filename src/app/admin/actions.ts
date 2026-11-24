"use server";

/**
 * Acciones del panel de administración. TODAS verifican que la sesión sea de
 * un administrador (Supabase Auth + ADMIN_EMAILS) antes de tocar datos, y
 * renuevan la caché de la tienda para que los cambios se vean al instante.
 */
import { updateTag } from "next/cache";
import { SEED_CAPSULE, SEED_MODELS, SEED_PRODUCTS } from "@/config/catalog";
import { PRICES } from "@/config/pricing";
import { slugify } from "@/lib/catalog/helpers";
import { MEDIA_BUCKET, type MediaRow } from "@/lib/catalog/db";
import { CATALOG_TAG } from "@/lib/catalog/server";
import { seedSku } from "@/lib/catalog/seed";
import { MEDIA_KINDS, type MediaKind } from "@/lib/catalog/types";
import { toMediaItem, type MediaItem } from "@/lib/admin/data";
import {
  cleanHref,
  isHomeSection,
  isUuid,
  STORAGE_PATH_RE,
  storagePathFor,
  validateCollection,
  validateProduct,
  validateUpload,
  type UploadRequest,
} from "@/lib/admin/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/server";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const ok = <T,>(data: T): ActionResult<T> => ({ ok: true, data });
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

async function admin() {
  const user = await getAdminUser();
  if (!user) throw new AuthError();
  const db = supabaseAdmin();
  if (!db) throw new ConfigError();
  return db;
}
class AuthError extends Error {}
class ConfigError extends Error {}

/** Envuelve cada acción: errores claros y nunca detalles internos al navegador. */
async function run<T>(fn: (db: NonNullable<ReturnType<typeof supabaseAdmin>>) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn(await admin());
  } catch (e) {
    if (e instanceof AuthError) return fail("Tu sesión expiró. Vuelve a ingresar.");
    if (e instanceof ConfigError) return fail("Supabase no está configurado (ver README).");
    console.error("[admin]", e);
    return fail("Ocurrió un error inesperado. Intenta de nuevo.");
  }
}

function dbError(message: string) {
  if (/product_variants_sku_key|duplicate key.*sku/i.test(message)) return "Ese SKU ya lo usa otro producto. Cada color necesita un SKU distinto.";
  if (/violates foreign key/i.test(message)) return "Alguna foto o prenda seleccionada ya no existe. Recarga la página.";
  if (/duplicate key/i.test(message)) return "Ya existe un elemento con ese nombre o identificador.";
  if (/no encontrado/i.test(message)) return message;
  console.error("[admin db]", message);
  return "No se pudo guardar. Revisa los datos e intenta de nuevo.";
}

function refreshStore() {
  updateTag(CATALOG_TAG);
}

/* ------------------------------------------------------------------ */
/* Productos                                                           */
/* ------------------------------------------------------------------ */

async function freeId(db: NonNullable<ReturnType<typeof supabaseAdmin>>, table: "products" | "collections", base: string) {
  const root = slugify(base) || "producto";
  const { data } = await db.from(table).select("id").like("id", `${root}%`);
  const taken = new Set((data ?? []).map((r) => r.id as string));
  let id = root;
  for (let i = 2; taken.has(id); i++) id = `${root}-${i}`;
  return id;
}

export async function createProduct(name: string, category: string): Promise<ActionResult<{ id: string }>> {
  return run(async (db) => {
    const n = (name ?? "").trim().slice(0, 120);
    if (!n) return fail("Escribe un nombre para el producto.");
    const id = await freeId(db, "products", n);
    const { data: last } = await db.from("products").select("sort_order").order("sort_order", { ascending: false }).limit(1);
    const { error } = await db.from("products").insert({
      id,
      name: n,
      category: category || "poleras",
      price: 0,
      status: "draft",
      sizes: category === "pantalones" ? ["38", "40", "42", "44", "46", "48"] : ["S", "M", "L", "XL", "XXL"],
      sort_order: ((last?.[0]?.sort_order as number | undefined) ?? 0) + 10,
    });
    if (error) return fail(dbError(error.message));
    return ok({ id });
  });
}

export async function saveProduct(input: unknown): Promise<ActionResult> {
  return run(async (db) => {
    const v = validateProduct(input);
    if (!v.ok) return fail(v.error);
    const { error } = await db.rpc("admin_save_product", { p: v.value });
    if (error) return fail(dbError(error.message));
    refreshStore();
    return ok(undefined);
  });
}

export async function setProductStatus(id: string, status: "draft" | "published"): Promise<ActionResult> {
  return run(async (db) => {
    if (status === "published") {
      const { data: p } = await db.from("products").select("price,sizes").eq("id", id).single();
      const { data: vs } = await db.from("product_variants").select("active,sizes").eq("product_id", id);
      if (!p) return fail("Producto no encontrado.");
      if (!(p.price > 0)) return fail("Para publicar, el producto necesita un precio mayor a $0.");
      const active = (vs ?? []).filter((x) => x.active);
      if (!active.length) return fail("Para publicar, agrega al menos un color activo.");
      if (active.some((x) => !(x.sizes?.length || p.sizes?.length))) return fail("Para publicar, cada color activo necesita tallas.");
    }
    const { error } = await db.from("products").update({ status: status === "published" ? "published" : "draft", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return fail(dbError(error.message));
    refreshStore();
    return ok(undefined);
  });
}

export async function duplicateProduct(id: string): Promise<ActionResult<{ id: string }>> {
  return run(async (db) => {
    const { data: p } = await db.from("products").select("*").eq("id", id).single();
    if (!p) return fail("Producto no encontrado.");
    const newId = await freeId(db, "products", `${id}-copia`);
    const { error } = await db.from("products").insert({ ...p, id: newId, name: `${p.name} (copia)`, status: "draft", created_at: undefined, updated_at: undefined, sort_order: p.sort_order + 1 });
    if (error) return fail(dbError(error.message));
    const { data: vs } = await db.from("product_variants").select("*").eq("product_id", id).order("sort_order");
    for (const v of vs ?? []) {
      let sku = `${v.sku}-COPIA`;
      for (let i = 2; ; i++) {
        const { data: clash } = await db.from("product_variants").select("id").eq("sku", sku).maybeSingle();
        if (!clash) break;
        sku = `${v.sku}-COPIA${i}`;
      }
      const { data: nv, error: e2 } = await db
        .from("product_variants")
        .insert({ product_id: newId, slug: v.slug, color_name: v.color_name, hex: v.hex, sku, sizes: v.sizes, price: v.price, active: v.active, sort_order: v.sort_order })
        .select("id")
        .single();
      if (e2 || !nv) return fail(dbError(e2?.message ?? ""));
      const { data: links } = await db.from("variant_media").select("media_id,sort_order").eq("variant_id", v.id);
      if (links?.length) await db.from("variant_media").insert(links.map((l) => ({ ...l, variant_id: nv.id })));
    }
    return ok({ id: newId });
  });
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  return run(async (db) => {
    const { error } = await db.from("products").delete().eq("id", id);
    if (error) return fail(dbError(error.message));
    refreshStore();
    return ok(undefined);
  });
}

/** Guarda el orden de aparición en el catálogo (lista de ids en orden). */
export async function reorderProducts(ids: string[]): Promise<ActionResult> {
  return run(async (db) => {
    if (!Array.isArray(ids) || ids.length > 500) return fail("Orden inválido.");
    for (const [i, id] of ids.entries()) {
      const { error } = await db.from("products").update({ sort_order: (i + 1) * 10 }).eq("id", String(id));
      if (error) return fail(dbError(error.message));
    }
    refreshStore();
    return ok(undefined);
  });
}

/* ------------------------------------------------------------------ */
/* Fotos                                                               */
/* ------------------------------------------------------------------ */

export type UploadTarget = { path: string; signedUrl: string; token: string };

/** Entrega URLs firmadas (válidas 2 h) para subir fotos ya optimizadas. */
export async function createUploadTargets(files: UploadRequest[]): Promise<ActionResult<UploadTarget[]>> {
  return run(async (db) => {
    if (!Array.isArray(files) || files.length === 0 || files.length > 30) return fail("Puedes subir entre 1 y 30 fotos a la vez.");
    for (const f of files) {
      const err = validateUpload(f);
      if (err) return fail(err);
    }
    const out: UploadTarget[] = [];
    for (const f of files) {
      const path = storagePathFor(f.type);
      const { data, error } = await db.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
      if (error || !data) return fail(/bucket/i.test(error?.message ?? "") ? "Falta crear el almacenamiento de fotos: ejecuta supabase/schema.sql." : "No se pudo preparar la subida.");
      out.push({ path, signedUrl: data.signedUrl, token: data.token });
    }
    return ok(out);
  });
}

export type RegisterEntry = {
  path: string;
  width: number;
  height: number;
  bytes: number;
  mime: string;
  originalName: string;
  alt: string;
  kind: MediaKind;
  isAi: boolean;
};

const KINDS = new Set<string>(MEDIA_KINDS.map((k) => k.id));

function cleanEntry(e: RegisterEntry) {
  return {
    storage_path: e.path,
    width: Number.isFinite(e.width) ? Math.round(e.width) : null,
    height: Number.isFinite(e.height) ? Math.round(e.height) : null,
    bytes: Number.isFinite(e.bytes) ? Math.round(e.bytes) : null,
    mime: String(e.mime).slice(0, 40),
    original_name: String(e.originalName ?? "").slice(0, 200),
    alt: String(e.alt ?? "").trim().slice(0, 300),
    kind: KINDS.has(e.kind) ? e.kind : "producto",
    is_ai: Boolean(e.isAi),
  };
}

/** Registra en la biblioteca las fotos ya subidas (verifica que existan en Storage). */
export async function registerMedia(entries: RegisterEntry[]): Promise<ActionResult<MediaItem[]>> {
  return run(async (db) => {
    if (!Array.isArray(entries) || entries.length === 0 || entries.length > 30) return fail("Datos de fotos inválidos.");
    for (const e of entries) {
      if (!STORAGE_PATH_RE.test(e.path)) return fail("Ruta de foto inválida.");
      const { data: exists } = await db.storage.from(MEDIA_BUCKET).exists(e.path);
      if (!exists) return fail("Una de las fotos no terminó de subirse. Intenta de nuevo.");
    }
    const { data, error } = await db.from("media").insert(entries.map(cleanEntry)).select("*");
    if (error) return fail(dbError(error.message));
    return ok(((data ?? []) as MediaRow[]).map((m) => toMediaItem(m)));
  });
}

export async function updateMedia(id: string, patch: { alt?: string; kind?: MediaKind; isAi?: boolean }): Promise<ActionResult> {
  return run(async (db) => {
    if (!isUuid(id)) return fail("Foto inválida.");
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof patch.alt === "string") row.alt = patch.alt.trim().slice(0, 300);
    if (patch.kind && KINDS.has(patch.kind)) row.kind = patch.kind;
    if (typeof patch.isAi === "boolean") row.is_ai = patch.isAi;
    const { error } = await db.from("media").update(row).eq("id", id);
    if (error) return fail(dbError(error.message));
    refreshStore();
    return ok(undefined);
  });
}

/** Reemplaza el archivo de una foto manteniendo sus usos (productos, modelos, inicio…). */
export async function replaceMediaFile(id: string, entry: RegisterEntry): Promise<ActionResult<MediaItem>> {
  return run(async (db) => {
    if (!isUuid(id) || !STORAGE_PATH_RE.test(entry.path)) return fail("Datos inválidos.");
    const { data: exists } = await db.storage.from(MEDIA_BUCKET).exists(entry.path);
    if (!exists) return fail("La nueva foto no terminó de subirse.");
    const { data: old } = await db.from("media").select("storage_path").eq("id", id).single();
    if (!old) return fail("Foto no encontrada.");
    const c = cleanEntry(entry);
    const { data, error } = await db
      .from("media")
      .update({ storage_path: c.storage_path, width: c.width, height: c.height, bytes: c.bytes, mime: c.mime, original_name: c.original_name, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) return fail(dbError(error?.message ?? ""));
    await db.storage.from(MEDIA_BUCKET).remove([old.storage_path]);
    refreshStore();
    return ok(toMediaItem(data as MediaRow));
  });
}

/** Elimina la foto de la biblioteca, de todos sus usos y del almacenamiento. */
export async function deleteMedia(ids: string[]): Promise<ActionResult> {
  return run(async (db) => {
    const valid = (ids ?? []).filter(isUuid).slice(0, 100);
    if (!valid.length) return fail("Nada que eliminar.");
    const { data: rows } = await db.from("media").select("id,storage_path").in("id", valid);
    const { error } = await db.from("media").delete().in("id", valid);
    if (error) return fail(dbError(error.message));
    const paths = (rows ?? []).map((r) => r.storage_path as string);
    if (paths.length) await db.storage.from(MEDIA_BUCKET).remove(paths);
    refreshStore();
    return ok(undefined);
  });
}

/** Prendas que aparecen en una foto (varias para un outfit completo). */
export async function setMediaProducts(mediaId: string, tags: { productId: string; variantId: string | null }[]): Promise<ActionResult> {
  return run(async (db) => {
    if (!isUuid(mediaId) || !Array.isArray(tags) || tags.length > 20) return fail("Datos inválidos.");
    const clean = tags
      .filter((t) => typeof t.productId === "string" && /^[a-z0-9-]+$/.test(t.productId))
      .map((t) => ({ media_id: mediaId, product_id: t.productId, variant_id: isUuid(t.variantId) ? t.variantId : null }));
    const { error: e1 } = await db.from("media_products").delete().eq("media_id", mediaId);
    if (e1) return fail(dbError(e1.message));
    if (clean.length) {
      const { error } = await db.from("media_products").insert(clean);
      if (error) return fail(dbError(error.message));
    }
    return ok(undefined);
  });
}

/* ------------------------------------------------------------------ */
/* Modelos                                                             */
/* ------------------------------------------------------------------ */

export async function createModel(name: string): Promise<ActionResult<{ id: string }>> {
  return run(async (db) => {
    const n = (name ?? "").trim().slice(0, 80) || "Nuevo modelo";
    const { data, error } = await db.from("models").insert({ name: n, sort_order: Date.now() % 100000 }).select("id").single();
    if (error || !data) return fail(dbError(error?.message ?? ""));
    return ok({ id: data.id as string });
  });
}

export async function saveModel(input: { id: string; name: string; age: number | null; notes: string; referenceMediaId: string | null; mediaIds: string[] }): Promise<ActionResult> {
  return run(async (db) => {
    if (!isUuid(input?.id)) return fail("Modelo inválido.");
    const name = String(input.name ?? "").trim().slice(0, 80);
    if (!name) return fail("El modelo necesita un nombre o identificador.");
    const age = input.age === null || input.age === undefined || (input.age as unknown) === "" ? null : Math.round(Number(input.age));
    if (age !== null && !(age >= 16 && age <= 90)) return fail("La edad debe estar entre 16 y 90.");
    const { error } = await db
      .from("models")
      .update({ name, age, notes: String(input.notes ?? "").slice(0, 1000), reference_media_id: isUuid(input.referenceMediaId) ? input.referenceMediaId : null })
      .eq("id", input.id);
    if (error) return fail(dbError(error.message));
    const ids = [...new Set((input.mediaIds ?? []).filter(isUuid))].slice(0, 200);
    await db.from("model_media").delete().eq("model_id", input.id);
    if (ids.length) {
      const { error: e2 } = await db.from("model_media").insert(ids.map((media_id, i) => ({ model_id: input.id, media_id, sort_order: i })));
      if (e2) return fail(dbError(e2.message));
    }
    return ok(undefined);
  });
}

export async function deleteModel(id: string): Promise<ActionResult> {
  return run(async (db) => {
    if (!isUuid(id)) return fail("Modelo inválido.");
    const { error } = await db.from("models").delete().eq("id", id);
    if (error) return fail(dbError(error.message));
    return ok(undefined);
  });
}

/* ------------------------------------------------------------------ */
/* Guardarropas y colecciones                                          */
/* ------------------------------------------------------------------ */

export async function createCollection(name: string): Promise<ActionResult<{ id: string }>> {
  return run(async (db) => {
    const n = (name ?? "").trim().slice(0, 120);
    if (!n) return fail("Escribe un nombre para el guardarropa.");
    const id = await freeId(db, "collections", n);
    const { error } = await db.from("collections").insert({ id, name: n, price: 0, status: "draft", top_sizes: ["S", "M", "L", "XL", "XXL"], bottom_sizes: ["38", "40", "42", "44", "46", "48"] });
    if (error) return fail(dbError(error.message));
    return ok({ id });
  });
}

export async function saveCollection(input: unknown): Promise<ActionResult> {
  return run(async (db) => {
    const v = validateCollection(input);
    if (!v.ok) return fail(v.error);
    const { error } = await db.rpc("admin_save_collection", { p: v.value });
    if (error) return fail(dbError(error.message));
    refreshStore();
    return ok(undefined);
  });
}

export async function deleteCollection(id: string): Promise<ActionResult> {
  return run(async (db) => {
    const { error } = await db.from("collections").delete().eq("id", String(id));
    if (error) return fail(dbError(error.message));
    refreshStore();
    return ok(undefined);
  });
}

/* ------------------------------------------------------------------ */
/* Página principal                                                    */
/* ------------------------------------------------------------------ */

export async function saveHomeSection(section: string, items: { mediaId: string; title?: string; subtitle?: string; href?: string }[]): Promise<ActionResult> {
  return run(async (db) => {
    if (!isHomeSection(section)) return fail("Sección inválida.");
    if (!Array.isArray(items) || items.length > 12) return fail("Máximo 12 imágenes por sección.");
    const single = section === "hero" || section === "wardrobe" || section.startsWith("category:");
    const list = single ? items.slice(0, 1) : items;
    const rows = [];
    for (const [i, it] of list.entries()) {
      if (!isUuid(it.mediaId)) return fail("Foto inválida.");
      const href = cleanHref(it.href);
      if (href === null) return fail("Los enlaces deben empezar con / (página de la tienda) o https://.");
      rows.push({ section, media_id: it.mediaId, title: String(it.title ?? "").slice(0, 120), subtitle: String(it.subtitle ?? "").slice(0, 240), href, sort_order: i });
    }
    const { error: e1 } = await db.from("home_images").delete().eq("section", section);
    if (e1) return fail(dbError(e1.message));
    if (rows.length) {
      const { error } = await db.from("home_images").insert(rows);
      if (error) return fail(dbError(error.message));
    }
    refreshStore();
    return ok(undefined);
  });
}

/* ------------------------------------------------------------------ */
/* Migración del catálogo inicial                                       */
/* ------------------------------------------------------------------ */

/**
 * Copia el catálogo original (src/config) a la base de datos: 4 productos con
 * sus colores, precios y textos, el guardarropa FRMA 01 y los 3 modelos.
 * No sobrescribe nada que ya exista.
 */
export async function importSeedCatalog(): Promise<ActionResult<{ products: number; variants: number }>> {
  return run(async (db) => {
    let products = 0;
    let variants = 0;
    for (const [i, p] of SEED_PRODUCTS.entries()) {
      const { data: exists } = await db.from("products").select("id").eq("id", p.id).maybeSingle();
      if (exists) continue;
      const { error } = await db.from("products").insert({
        id: p.id,
        name: p.name,
        category: p.category,
        tagline: p.tagline,
        description: p.description,
        price: PRICES[p.id],
        material: p.material,
        fit: p.fit,
        care: p.care,
        sizes: p.sizes,
        status: "published",
        sort_order: (i + 1) * 10,
      });
      if (error) return fail(dbError(error.message));
      products++;
      const { error: e2 } = await db.from("product_variants").insert(
        p.colors.map((c, j) => ({ product_id: p.id, slug: c.id, color_name: c.name, hex: c.hex.toUpperCase(), sku: seedSku(p.id, c.id), sort_order: j, active: true })),
      );
      if (e2) return fail(dbError(e2.message));
      variants += p.colors.length;
    }

    const { data: coll } = await db.from("collections").select("id").eq("id", SEED_CAPSULE.id).maybeSingle();
    if (!coll) {
      const { error } = await db.from("collections").insert({
        id: SEED_CAPSULE.id,
        name: SEED_CAPSULE.name,
        tagline: SEED_CAPSULE.tagline,
        description: SEED_CAPSULE.description,
        price: SEED_CAPSULE.price,
        status: "published",
        top_sizes: SEED_CAPSULE.topSizes,
        bottom_sizes: SEED_CAPSULE.bottomSizes,
        sort_order: 10,
      });
      if (error) return fail(dbError(error.message));
      const { data: vs } = await db.from("product_variants").select("id,product_id,slug");
      const items = SEED_CAPSULE.pieces.flatMap((piece, i) => {
        const v = (vs ?? []).find((x) => x.product_id === piece.productId && x.slug === piece.variantSlug);
        return v ? [{ collection_id: SEED_CAPSULE.id, variant_id: v.id, role: piece.role, sort_order: i }] : [];
      });
      if (items.length) {
        const { error: e3 } = await db.from("collection_items").insert(items);
        if (e3) return fail(dbError(e3.message));
      }
    }

    const { count } = await db.from("models").select("id", { count: "exact", head: true });
    if (!count) await db.from("models").insert(SEED_MODELS.map((m, i) => ({ ...m, sort_order: i })));

    refreshStore();
    return ok({ products, variants });
  });
}
