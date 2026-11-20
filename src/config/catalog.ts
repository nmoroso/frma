/**
 * CATÁLOGO FRMA — archivo editable
 * ---------------------------------------------------------------
 * Para cambiar productos, colores, tallas, textos o fotos, edita SOLO este
 * archivo (y los precios en pricing.ts). Los componentes leen todo desde aquí.
 *
 * Fotos:
 *  - Copia tus archivos a /public/images/productos/ y agrega la ruta en
 *    `images` del color correspondiente, p. ej. "/images/productos/polera-blanco-1.jpg".
 *  - Marca `conceptual: true` si la imagen fue generada con IA o es un render:
 *    el sitio mostrará la etiqueta "Imagen conceptual".
 *  - Si `images` está vacío se muestra una ilustración neutra (placeholder).
 *  - Nunca uses fotos de productos de otras marcas.
 *
 * Campos marcados con PENDIENTE deben verificarse con el proveedor antes de lanzar.
 */
import { PRICES, type PricedId } from "./pricing";

export type ProductImage = {
  src: string;
  alt: string;
  /** true = imagen generada con IA / conceptual. Se etiqueta en el sitio. */
  conceptual?: boolean;
};

export type ColorOption = {
  id: string; // slug, se usa en URLs y en item_variant
  name: string; // nombre visible
  hex: string; // color del swatch y del placeholder
  images: ProductImage[];
};

export type Category = "poleras" | "pantalones" | "polos" | "camisas";

export type GarmentShape = "tee" | "chino" | "polo" | "shirt";

export type Product = {
  id: PricedId; // también es el item_id en analítica
  slug: string;
  name: string;
  category: Category;
  shape: GarmentShape;
  tagline: string;
  description: string;
  colors: ColorOption[];
  sizes: string[];
  /** Detalles técnicos: deja "Pendiente de verificar" hasta confirmar con proveedor. */
  details: { label: string; value: string }[];
  care: string;
};

export const CATEGORIES: { id: Category; name: string; ga4: string }[] = [
  { id: "poleras", name: "Poleras", ga4: "Poleras" },
  { id: "pantalones", name: "Pantalones", ga4: "Pantalones" },
  { id: "polos", name: "Polos", ga4: "Polos" },
  { id: "camisas", name: "Camisas", ga4: "Camisas" },
];

const PENDING = "Pendiente de verificar";

const TOP_SIZES = ["S", "M", "L", "XL", "XXL"];
const BOTTOM_SIZES = ["38", "40", "42", "44", "46", "48"];

export const PRODUCTS: Product[] = [
  {
    id: "polera-essential",
    slug: "polera-essential",
    name: "Polera Essential",
    category: "poleras",
    shape: "tee",
    tagline: "La base de todo.",
    description:
      "Polera de cuello redondo con calce regular. Pensada para usarse sola o bajo una camisa abierta, todos los días.",
    colors: [
      { id: "blanco", name: "Blanco", hex: "#F4F2EE", images: [] },
      { id: "azul-marino", name: "Azul marino", hex: "#1F2A3C", images: [] },
      { id: "gris-carbon", name: "Gris carbón", hex: "#45474B", images: [] },
    ],
    sizes: TOP_SIZES,
    details: [
      { label: "Material", value: PENDING },
      { label: "Gramaje", value: PENDING },
      { label: "Calce", value: "Regular (pendiente de verificar)" },
      { label: "Origen", value: PENDING },
    ],
    care: PENDING,
  },
  {
    id: "chino-everyday",
    slug: "chino-everyday",
    name: "Chino Everyday",
    category: "pantalones",
    shape: "chino",
    tagline: "De la oficina al fin de semana.",
    description:
      "Pantalón chino de pierna recta y tiro medio. Un punto medio entre el jeans y el pantalón de vestir.",
    colors: [
      { id: "beige", name: "Beige", hex: "#CDBB9C", images: [] },
      { id: "azul-marino", name: "Azul marino", hex: "#1F2A3C", images: [] },
    ],
    sizes: BOTTOM_SIZES,
    details: [
      { label: "Material", value: PENDING },
      { label: "Elasticidad", value: PENDING },
      { label: "Calce", value: "Recto (pendiente de verificar)" },
      { label: "Origen", value: PENDING },
    ],
    care: PENDING,
  },
  {
    id: "polo-classic",
    slug: "polo-classic",
    name: "Polo Classic",
    category: "polos",
    shape: "polo",
    tagline: "Más formal que una polera, más relajado que una camisa.",
    description:
      "Polo de piqué con cuello estructurado y tapeta de dos botones. Funciona con chinos y con jeans.",
    colors: [
      { id: "azul-marino", name: "Azul marino", hex: "#1F2A3C", images: [] },
      { id: "crudo", name: "Crudo", hex: "#E9E2D3", images: [] },
    ],
    sizes: TOP_SIZES,
    details: [
      { label: "Material", value: PENDING },
      { label: "Tejido", value: "Piqué (pendiente de verificar)" },
      { label: "Calce", value: "Regular (pendiente de verificar)" },
      { label: "Origen", value: PENDING },
    ],
    care: PENDING,
  },
  {
    id: "camisa-oxford",
    slug: "camisa-oxford",
    name: "Camisa Oxford",
    category: "camisas",
    shape: "shirt",
    tagline: "La camisa que combina con todo.",
    description:
      "Camisa de tela oxford con cuello abotonado. Se usa abotonada, abierta sobre una polera o con las mangas recogidas.",
    colors: [
      { id: "celeste", name: "Celeste", hex: "#B9CCE0", images: [] },
      { id: "blanco", name: "Blanco", hex: "#F7F6F2", images: [] },
    ],
    sizes: TOP_SIZES,
    details: [
      { label: "Material", value: PENDING },
      { label: "Tela", value: "Oxford (pendiente de verificar)" },
      { label: "Calce", value: "Regular (pendiente de verificar)" },
      { label: "Origen", value: PENDING },
    ],
    care: PENDING,
  },
];

/* ------------------------------------------------------------------ */
/* CÁPSULA FRMA 01                                                     */
/* ------------------------------------------------------------------ */

export type CapsulePiece = {
  productId: PricedId;
  colorId: string;
  role: "top" | "bottom";
};

export type Capsule = {
  id: PricedId;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  pieces: CapsulePiece[];
  topSizes: string[];
  bottomSizes: string[];
  heroImage?: ProductImage;
};

export const CAPSULE: Capsule = {
  id: "frma-01",
  slug: "frma-01",
  name: "FRMA 01",
  tagline: "7 piezas. 10 combinaciones. Tu ropero, resuelto.",
  description:
    "Un guardarropa base seleccionado para que todo combine con todo. Eliges tu talla de arriba y tu talla de pantalón, y listo.",
  pieces: [
    { productId: "polera-essential", colorId: "blanco", role: "top" },
    { productId: "polera-essential", colorId: "azul-marino", role: "top" },
    { productId: "polera-essential", colorId: "gris-carbon", role: "top" },
    { productId: "polo-classic", colorId: "crudo", role: "top" },
    { productId: "camisa-oxford", colorId: "celeste", role: "top" },
    { productId: "chino-everyday", colorId: "beige", role: "bottom" },
    { productId: "chino-everyday", colorId: "azul-marino", role: "bottom" },
  ],
  topSizes: TOP_SIZES,
  bottomSizes: BOTTOM_SIZES,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function getProductBySlug(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getProductById(id: string) {
  return PRODUCTS.find((p) => p.id === id);
}

export function getColor(product: Product, colorId?: string) {
  return product.colors.find((c) => c.id === colorId) ?? product.colors[0];
}

export function getCategoryName(category: Category) {
  return CATEGORIES.find((c) => c.id === category)?.name ?? category;
}

/** Precio base (sin experimento). Para mostrar precios usa usePrice(). */
export function basePrice(id: PricedId): number {
  return PRICES[id];
}

export function capsulePieces() {
  return CAPSULE.pieces.map((piece) => {
    const product = getProductById(piece.productId)!;
    return { ...piece, product, color: getColor(product, piece.colorId) };
  });
}

/** Todas las combinaciones prenda superior × pantalón de la cápsula. */
export function capsuleOutfits() {
  const pieces = capsulePieces();
  const tops = pieces.filter((p) => p.role === "top");
  const bottoms = pieces.filter((p) => p.role === "bottom");
  return bottoms.flatMap((bottom) =>
    tops.map((top) => ({
      id: `${top.product.id}-${top.color.id}__${bottom.color.id}`,
      top,
      bottom,
    })),
  );
}

/** Lista de colores únicos para el filtro del catálogo. */
export function allColors() {
  const map = new Map<string, { id: string; name: string; hex: string }>();
  for (const p of PRODUCTS) for (const c of p.colors) map.set(c.id, c);
  return [...map.values()];
}
