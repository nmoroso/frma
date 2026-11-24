import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { supabaseAdmin } from "../supabase/admin";
import { loadCatalogFromDb } from "./db";
import { seedCatalog } from "./seed";
import type { Catalog } from "./types";

export const CATALOG_TAG = "catalog";

/**
 * Catálogo PÚBLICO de la tienda (solo contenido publicado).
 * Se guarda en caché y se renueva al instante cuando el panel guarda cambios
 * (updateTag(CATALOG_TAG)). Como respaldo se renueva cada 5 minutos.
 *
 * Usa el catálogo inicial (src/config/catalog.ts) si Supabase no está
 * configurado, si las tablas aún no existen o si todavía no se importó nada.
 */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife({ stale: 60, revalidate: 300, expire: 86400 });

  const db = supabaseAdmin();
  if (!db) return seedCatalog();
  try {
    const { totalProducts, ...catalog } = await loadCatalogFromDb(db, false);
    if (totalProducts === 0) return seedCatalog();
    return catalog;
  } catch (e) {
    console.error("[catalog] No se pudo leer Supabase, se usa el catálogo inicial:", (e as Error).message);
    return seedCatalog();
  }
}
