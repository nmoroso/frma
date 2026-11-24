/**
 * Validación de lo que envía el panel. Funciones puras (se prueban en tests/).
 * Los mensajes están pensados para alguien sin conocimientos técnicos.
 */
import { CATEGORIES } from "@/config/catalog";
import { isValidHex, slugify } from "../catalog/helpers";

export const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
/** Tamaño máximo del archivo ORIGINAL que el panel acepta antes de optimizar. */
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
/** Tamaño máximo del archivo ya optimizado que se guarda (igual al límite del bucket). */
export const MAX_STORED_BYTES = 8 * 1024 * 1024;

export type VariantPayload = {
  id: string | null; // null = color nuevo
  slug: string; // vacío en colores nuevos: se genera desde el nombre
  name: string;
  hex: string;
  sku: string;
  sizes: string[] | null; // null = usa las tallas del producto
  price: number | null;
  active: boolean;
  mediaIds: string[];
};

export type ProductPayload = {
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
  sortOrder: number;
  variants: VariantPayload[];
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID_RE.test(s);

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : NaN);

function cleanSizes(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((s) => text(s, 12)).filter(Boolean))].slice(0, 30);
}

/** Genera un slug único entre los ya usados ("azul", "azul-2", …). */
export function uniqueSlug(base: string, taken: Set<string>) {
  const root = slugify(base) || "color";
  let slug = root;
  for (let i = 2; taken.has(slug); i++) slug = `${root}-${i}`;
  taken.add(slug);
  return slug;
}

export function validateProduct(input: unknown): Result<ProductPayload> {
  if (!input || typeof input !== "object") return { ok: false, error: "Datos inválidos." };
  const b = input as Record<string, unknown>;
  const name = text(b.name, 120);
  if (!name) return { ok: false, error: "El producto necesita un nombre." };
  const category = text(b.category, 40);
  if (!CATEGORIES.some((c) => c.id === category)) return { ok: false, error: "Elige una categoría válida." };
  const price = int(b.price);
  if (!(price >= 0) || price > 10_000_000) return { ok: false, error: "Escribe el precio en pesos, solo números (por ejemplo 19990)." };
  const status = b.status === "published" ? "published" : "draft";
  const sizes = cleanSizes(b.sizes);

  if (!Array.isArray(b.variants)) return { ok: false, error: "Datos de colores inválidos." };
  if (b.variants.length > 30) return { ok: false, error: "Máximo 30 colores por producto." };

  const variants: VariantPayload[] = [];
  const skus = new Set<string>();
  const slugs = new Set<string>(
    b.variants.map((v) => (v && typeof v === "object" ? text((v as Record<string, unknown>).slug, 60) : "")).filter(Boolean),
  );
  for (const [i, raw] of b.variants.entries()) {
    const v = (raw ?? {}) as Record<string, unknown>;
    const label = `Color ${i + 1}`;
    const vname = text(v.name, 60);
    if (!vname) return { ok: false, error: `${label}: escribe el nombre del color.` };
    const hex = text(v.hex, 7).toUpperCase();
    if (!isValidHex(hex)) return { ok: false, error: `${vname}: el código HEX debe tener el formato #RRGGBB (por ejemplo #1F2A3C).` };
    const sku = text(v.sku, 80).toUpperCase();
    if (!sku) return { ok: false, error: `${vname}: escribe un SKU (identificador único).` };
    if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(sku)) return { ok: false, error: `${vname}: el SKU solo puede tener letras, números, puntos, guiones y guiones bajos.` };
    if (skus.has(sku)) return { ok: false, error: `El SKU ${sku} está repetido en dos colores.` };
    skus.add(sku);
    const id = v.id === null || v.id === undefined || v.id === "" ? null : v.id;
    if (id !== null && !isUuid(id)) return { ok: false, error: "Color con identificador inválido." };
    const ownSizes = v.sizes === null ? null : cleanSizes(v.sizes);
    const vprice = v.price === null || v.price === undefined || v.price === "" ? null : int(v.price);
    if (vprice !== null && !(vprice >= 0 && vprice <= 10_000_000)) return { ok: false, error: `${vname}: el precio específico debe ser un número en pesos.` };
    const mediaIds = Array.isArray(v.mediaIds) ? [...new Set(v.mediaIds.filter(isUuid))].slice(0, 40) : [];
    const existingSlug = text(v.slug, 60);
    const slug = existingSlug && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(existingSlug) ? existingSlug : uniqueSlug(vname, slugs);
    variants.push({ id, slug, name: vname, hex, sku, sizes: ownSizes && ownSizes.length ? ownSizes : null, price: vprice, active: v.active !== false, mediaIds });
  }

  if (status === "published") {
    if (price <= 0) return { ok: false, error: "Para publicar, el producto necesita un precio mayor a $0." };
    const active = variants.filter((v) => v.active);
    if (active.length === 0) return { ok: false, error: "Para publicar, agrega al menos un color activo." };
    const noSizes = active.find((v) => (v.sizes ?? sizes).length === 0);
    if (noSizes) return { ok: false, error: `Para publicar, ${noSizes.name} necesita al menos una talla.` };
  }

  return {
    ok: true,
    value: {
      id: text(b.id, 80),
      name,
      category,
      tagline: text(b.tagline, 160),
      description: text(b.description, 4000),
      price,
      material: text(b.material, 600),
      fit: text(b.fit, 600),
      care: text(b.care, 600),
      sizes,
      status,
      sortOrder: Number.isFinite(int(b.sortOrder)) ? int(b.sortOrder) : 0,
      variants,
    },
  };
}

export type CollectionPayload = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  status: "draft" | "published";
  topSizes: string[];
  bottomSizes: string[];
  heroMediaId: string | null;
  sortOrder: number;
  pieces: { variantId: string; role: "top" | "bottom" }[];
  mediaIds: string[];
};

export function validateCollection(input: unknown): Result<CollectionPayload> {
  if (!input || typeof input !== "object") return { ok: false, error: "Datos inválidos." };
  const b = input as Record<string, unknown>;
  const name = text(b.name, 120);
  if (!name) return { ok: false, error: "El guardarropa necesita un nombre." };
  const price = int(b.price);
  if (!(price >= 0) || price > 50_000_000) return { ok: false, error: "Escribe el precio en pesos, solo números." };
  const pieces = Array.isArray(b.pieces)
    ? b.pieces
        .map((p) => (p ?? {}) as Record<string, unknown>)
        .filter((p) => isUuid(p.variantId))
        .map((p) => ({ variantId: p.variantId as string, role: (p.role === "bottom" ? "bottom" : "top") as "top" | "bottom" }))
        .slice(0, 40)
    : [];
  const status = b.status === "published" ? "published" : "draft";
  const topSizes = cleanSizes(b.topSizes);
  const bottomSizes = cleanSizes(b.bottomSizes);
  if (status === "published") {
    if (price <= 0) return { ok: false, error: "Para publicar, el guardarropa necesita un precio mayor a $0." };
    if (pieces.length === 0) return { ok: false, error: "Para publicar, agrega al menos una prenda." };
    if (!topSizes.length || !bottomSizes.length) return { ok: false, error: "Para publicar, define tallas superiores y de pantalón." };
  }
  return {
    ok: true,
    value: {
      id: text(b.id, 80),
      name,
      tagline: text(b.tagline, 160),
      description: text(b.description, 4000),
      price,
      status,
      topSizes,
      bottomSizes,
      heroMediaId: isUuid(b.heroMediaId) ? b.heroMediaId : null,
      sortOrder: Number.isFinite(int(b.sortOrder)) ? int(b.sortOrder) : 0,
      pieces,
      mediaIds: Array.isArray(b.mediaIds) ? [...new Set(b.mediaIds.filter(isUuid))].slice(0, 60) : [],
    },
  };
}

export type UploadRequest = { name: string; type: string; size: number };

export function validateUpload(f: UploadRequest): string | null {
  if (!ALLOWED_UPLOAD_TYPES.includes(f.type as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
    return `${f.name}: formato no permitido. Usa JPG, PNG, WebP o AVIF.`;
  }
  if (!(f.size > 0) || f.size > MAX_STORED_BYTES) return `${f.name}: el archivo optimizado supera 8 MB.`;
  return null;
}

/** Ruta en Storage: 2026/11/<uuid>.webp */
export function storagePathFor(type: string, now = new Date(), id: string = crypto.randomUUID()) {
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" }[type] ?? "bin";
  return `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${id}.${ext}`;
}
export const STORAGE_PATH_RE = /^\d{4}\/\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/;

export const HOME_SECTIONS = ["hero", "banner", "wardrobe", "editorial", "featured"] as const;
export function isHomeSection(s: string) {
  return (HOME_SECTIONS as readonly string[]).includes(s) || (s.startsWith("category:") && CATEGORIES.some((c) => `category:${c.id}` === s));
}

/** Enlaces del inicio: solo rutas internas (/...) o https. */
export function cleanHref(href: unknown) {
  const h = text(href, 300);
  if (!h) return "";
  if (h.startsWith("/") && !h.startsWith("//")) return h;
  if (/^https:\/\/[^\s]+$/i.test(h)) return h;
  return null;
}
