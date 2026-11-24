/**
 * Funciones puras sobre el catálogo (servidor y navegador).
 */
import { CATEGORIES } from "@/config/catalog";
import type { Catalog, Collection, GarmentShape, Product, Variant } from "./types";

export const MAIN_COLLECTION_ID = "frma-01";

export function categoryName(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id.charAt(0).toUpperCase() + id.slice(1);
}

export function shapeFor(category: string): GarmentShape {
  return CATEGORIES.find((c) => c.id === category)?.shape ?? "tee";
}

export function findProduct(catalog: Catalog, id: string): Product | undefined {
  return catalog.products.find((p) => p.id === id);
}

export function findCollection(catalog: Catalog, id: string): Collection | undefined {
  return catalog.collections.find((c) => c.id === id);
}

export function activeVariants(product: Product): Variant[] {
  return product.variants.filter((v) => v.active);
}

/** Variante por slug (?color=), o la primera activa. */
export function pickVariant(product: Product, slug?: string | null): Variant | undefined {
  const list = activeVariants(product);
  return list.find((v) => v.slug === slug) ?? list[0];
}

/** Precio base de una variante (sin experimentos). */
export function variantBasePrice(product: Product, variant?: Variant) {
  return variant?.price ?? product.price;
}

/** Piezas de un guardarropa resueltas contra el catálogo (omite las no publicadas). */
export function collectionPieces(catalog: Catalog, collection: Collection) {
  return collection.pieces.flatMap((piece) => {
    const product = findProduct(catalog, piece.productId);
    const variant = product?.variants.find((v) => v.slug === piece.variantSlug && v.active);
    return product && variant ? [{ ...piece, product, variant }] : [];
  });
}

/** Combinaciones prenda superior × pantalón. */
export function collectionOutfits(catalog: Catalog, collection: Collection) {
  const pieces = collectionPieces(catalog, collection);
  const tops = pieces.filter((p) => p.role === "top");
  const bottoms = pieces.filter((p) => p.role === "bottom");
  return bottoms.flatMap((bottom) =>
    tops.map((top) => ({ id: `${top.product.id}-${top.variant.slug}__${bottom.product.id}-${bottom.variant.slug}`, top, bottom })),
  );
}

/** Suma de las piezas compradas por separado. */
export function collectionSeparatePrice(catalog: Catalog, collection: Collection, priceOf: (id: string, base: number) => number) {
  return collectionPieces(catalog, collection).reduce((s, p) => s + priceOf(p.product.id, variantBasePrice(p.product, p.variant)), 0);
}

/** Colores únicos (por nombre) para el filtro del catálogo. */
export function allColors(catalog: Catalog) {
  const map = new Map<string, { key: string; name: string; hex: string }>();
  for (const p of catalog.products)
    for (const v of activeVariants(p)) {
      const key = colorKey(v.name);
      if (!map.has(key)) map.set(key, { key, name: v.name, hex: v.hex });
    }
  return [...map.values()];
}

export function colorKey(name: string) {
  return slugify(name);
}

export function usedCategories(catalog: Catalog) {
  const used = new Set(catalog.products.map((p) => p.category));
  return CATEGORIES.filter((c) => used.has(c.id));
}

/** "Polera Essential" → "polera-essential" */
export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** ¿El color es tan claro que necesita borde visible? */
export function isLight(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return false;
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

export function isValidHex(hex: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}
