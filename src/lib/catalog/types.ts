/**
 * Modelo de datos del catálogo (serializable: viaja del servidor al navegador).
 * La fuente es Supabase; si Supabase no está configurado o aún no se importó
 * el catálogo, se usa el catálogo inicial de src/config/catalog.ts.
 */

export type GarmentShape = "tee" | "chino" | "polo" | "shirt";

export const MEDIA_KINDS = [
  { id: "producto", label: "Producto individual" },
  { id: "modelo", label: "Producto sobre modelo" },
  { id: "detalle", label: "Detalle de producto" },
  { id: "outfit", label: "Outfit completo" },
  { id: "editorial", label: "Editorial / campaña" },
] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number]["id"];

export type CatalogImage = {
  id: string | null; // null = imagen definida en el catálogo inicial (archivo local)
  src: string;
  alt: string;
  conceptual: boolean; // generada con IA → se rotula "Imagen conceptual"
  kind: MediaKind;
  width: number | null;
  height: number | null;
};

export type Variant = {
  id: string; // uuid en base de datos, o "seed:<producto>:<color>"
  slug: string; // se usa en la URL (?color=azul-marino)
  name: string; // nombre comercial del color
  hex: string; // color del círculo selector
  sku: string; // identificador único (variant_id en analítica)
  sizes: string[]; // tallas efectivas (propias o heredadas del producto)
  ownSizes: boolean;
  price: number | null; // null = precio del producto
  active: boolean;
  images: CatalogImage[]; // galería propia; la primera es la principal
};

export type Product = {
  id: string; // también URL (/producto/<id>) e item_id en analítica
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
  variants: Variant[];
};

export type CollectionPiece = { productId: string; variantSlug: string; role: "top" | "bottom" };

export type Collection = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  status: "draft" | "published";
  topSizes: string[];
  bottomSizes: string[];
  pieces: CollectionPiece[];
  heroImage: CatalogImage | null;
  images: CatalogImage[];
  sortOrder: number;
};

export type HomeImage = { image: CatalogImage; title: string; subtitle: string; href: string };

/** section → imágenes ordenadas. Secciones: hero, banner, category:<cat>, wardrobe, editorial, featured */
export type HomeImages = Record<string, HomeImage[]>;

export type Catalog = {
  source: "db" | "seed";
  products: Product[];
  collections: Collection[];
  home: HomeImages;
};
