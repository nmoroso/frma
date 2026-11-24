import "server-only";
import type { ServerDb } from "../supabase/admin";
import type { Catalog, CatalogImage, Collection, HomeImages, MediaKind, Product } from "./types";

export const MEDIA_BUCKET = "media";

export type MediaRow = {
  id: string;
  created_at: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  mime: string | null;
  original_name: string | null;
  alt: string;
  kind: MediaKind;
  is_ai: boolean;
};

type ProductRow = {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  price: number;
  material: string;
  fit: string;
  care: string;
  sizes: string[];
  status: "draft" | "published";
  sort_order: number;
};
type VariantRow = {
  id: string;
  product_id: string;
  slug: string;
  color_name: string;
  hex: string;
  sku: string;
  sizes: string[] | null;
  price: number | null;
  active: boolean;
  sort_order: number;
};
type Join = { media_id: string; sort_order: number };

export function publicUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function toImage(m: MediaRow): CatalogImage {
  return {
    id: m.id,
    src: publicUrl(m.storage_path),
    alt: m.alt,
    conceptual: m.is_ai,
    kind: m.kind,
    width: m.width,
    height: m.height,
  };
}

async function all<T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>, table: string): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as T[];
}

/**
 * Lee el catálogo completo desde Supabase.
 * includeDrafts=false → solo productos/guardarropas publicados y colores activos (tienda).
 */
export async function loadCatalogFromDb(db: ServerDb, includeDrafts: boolean): Promise<Catalog & { totalProducts: number }> {
  const [products, variants, variantMedia, media, collections, items, collMedia, home] = await Promise.all([
    all<ProductRow>(db.from("products").select("*").order("sort_order").order("name"), "products"),
    all<VariantRow>(db.from("product_variants").select("*").order("sort_order"), "product_variants"),
    all<Join & { variant_id: string }>(db.from("variant_media").select("*").order("sort_order"), "variant_media"),
    all<MediaRow>(db.from("media").select("*"), "media"),
    all<Record<string, unknown>>(db.from("collections").select("*").order("sort_order"), "collections"),
    all<{ collection_id: string; variant_id: string; role: "top" | "bottom"; sort_order: number }>(
      db.from("collection_items").select("*").order("sort_order"),
      "collection_items",
    ),
    all<Join & { collection_id: string }>(db.from("collection_media").select("*").order("sort_order"), "collection_media"),
    all<{ section: string; media_id: string; title: string; subtitle: string; href: string; sort_order: number }>(
      db.from("home_images").select("*").order("sort_order"),
      "home_images",
    ),
  ]);

  const mediaById = new Map(media.map((m) => [m.id, m]));
  const img = (id: string | null | undefined) => {
    const m = id ? mediaById.get(id) : undefined;
    return m ? toImage(m) : null;
  };
  const variantById = new Map(variants.map((v) => [v.id, v]));

  const visibleProducts = products.filter((p) => includeDrafts || p.status === "published");
  const outProducts: Product[] = visibleProducts.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    tagline: p.tagline,
    description: p.description,
    price: p.price,
    material: p.material,
    fit: p.fit,
    care: p.care,
    sizes: p.sizes ?? [],
    status: p.status,
    sortOrder: p.sort_order,
    variants: variants
      .filter((v) => v.product_id === p.id && (includeDrafts || v.active))
      .map((v) => ({
        id: v.id,
        slug: v.slug,
        name: v.color_name,
        hex: v.hex,
        sku: v.sku,
        sizes: v.sizes && v.sizes.length ? v.sizes : (p.sizes ?? []),
        ownSizes: Boolean(v.sizes && v.sizes.length),
        price: v.price,
        active: v.active,
        images: variantMedia
          .filter((j) => j.variant_id === v.id)
          .map((j) => img(j.media_id))
          .filter((x): x is CatalogImage => x !== null),
      })),
  }));
  // En la tienda, un producto sin colores activos no se puede comprar: se oculta.
  const shopProducts = includeDrafts ? outProducts : outProducts.filter((p) => p.variants.length > 0);
  const productIds = new Set(shopProducts.map((p) => p.id));

  const outCollections: Collection[] = collections
    .filter((c) => includeDrafts || c.status === "published")
    .map((c) => ({
      id: c.id as string,
      name: c.name as string,
      tagline: c.tagline as string,
      description: c.description as string,
      price: c.price as number,
      status: c.status as "draft" | "published",
      topSizes: (c.top_sizes as string[]) ?? [],
      bottomSizes: (c.bottom_sizes as string[]) ?? [],
      sortOrder: c.sort_order as number,
      heroImage: img(c.hero_media_id as string | null),
      images: collMedia
        .filter((j) => j.collection_id === c.id)
        .map((j) => img(j.media_id))
        .filter((x): x is CatalogImage => x !== null),
      pieces: items
        .filter((it) => it.collection_id === c.id)
        .flatMap((it) => {
          const v = variantById.get(it.variant_id);
          if (!v || (!includeDrafts && !productIds.has(v.product_id))) return [];
          return [{ productId: v.product_id, variantSlug: v.slug, role: it.role }];
        }),
    }));

  const outHome: HomeImages = {};
  for (const h of home) {
    const image = img(h.media_id);
    if (!image) continue;
    (outHome[h.section] ??= []).push({ image, title: h.title, subtitle: h.subtitle, href: h.href });
  }

  return { source: "db", products: shopProducts, collections: outCollections, home: outHome, totalProducts: products.length };
}
