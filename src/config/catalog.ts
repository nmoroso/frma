/**
 * CATÁLOGO INICIAL (semilla)
 * ---------------------------------------------------------------
 * Desde la versión 2 los productos se administran en /admin (Supabase).
 * Este archivo solo se usa:
 *   1. Para importar el catálogo original a la base de datos
 *      (botón "Importar catálogo inicial" del panel).
 *   2. Como respaldo si Supabase no está configurado.
 * Una vez importado, edita los productos desde el panel, no aquí.
 */
import { PRICES } from "./pricing";

/** Categorías disponibles en el panel y en los filtros del catálogo. */
export const CATEGORIES: { id: string; name: string; shape: "tee" | "chino" | "polo" | "shirt" }[] = [
  { id: "poleras", name: "Poleras", shape: "tee" },
  { id: "pantalones", name: "Pantalones", shape: "chino" },
  { id: "polos", name: "Polos", shape: "polo" },
  { id: "camisas", name: "Camisas", shape: "shirt" },
  { id: "sweaters", name: "Sweaters", shape: "shirt" },
  { id: "chaquetas", name: "Chaquetas", shape: "shirt" },
  { id: "shorts", name: "Shorts", shape: "chino" },
  { id: "accesorios", name: "Accesorios", shape: "tee" },
];

/** Grupos de tallas sugeridos en el panel (también se pueden escribir otras). */
export const SIZE_PRESETS = [
  { label: "Prendas superiores", sizes: ["XS", "S", "M", "L", "XL", "XXL"] },
  { label: "Pantalones (CL/EU)", sizes: ["38", "40", "42", "44", "46", "48", "50"] },
  { label: "Pantalones (cintura)", sizes: ["28", "30", "32", "34", "36", "38"] },
  { label: "Otros", sizes: ["Única"] },
];

const PENDING = "Pendiente de verificar";
const TOP_SIZES = ["S", "M", "L", "XL", "XXL"];
const BOTTOM_SIZES = ["38", "40", "42", "44", "46", "48"];

type SeedColor = { id: string; name: string; hex: string };
type SeedProduct = {
  id: keyof typeof PRICES;
  name: string;
  category: string;
  tagline: string;
  description: string;
  material: string;
  fit: string;
  care: string;
  sizes: string[];
  colors: SeedColor[];
};

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    id: "polera-essential",
    name: "Polera Essential",
    category: "poleras",
    tagline: "La base de todo.",
    description:
      "Polera de cuello redondo con calce regular. Pensada para usarse sola o bajo una camisa abierta, todos los días.",
    material: `${PENDING} (material, composición y gramaje)`,
    fit: "Calce regular (pendiente de verificar)",
    care: PENDING,
    sizes: TOP_SIZES,
    colors: [
      { id: "blanco", name: "Blanco", hex: "#F4F2EE" },
      { id: "azul-marino", name: "Azul marino", hex: "#1F2A3C" },
      { id: "gris-carbon", name: "Gris carbón", hex: "#45474B" },
    ],
  },
  {
    id: "chino-everyday",
    name: "Chino Everyday",
    category: "pantalones",
    tagline: "De la oficina al fin de semana.",
    description:
      "Pantalón chino de pierna recta y tiro medio. Un punto medio entre el jeans y el pantalón de vestir.",
    material: `${PENDING} (material, composición y elasticidad)`,
    fit: "Pierna recta, tiro medio (pendiente de verificar)",
    care: PENDING,
    sizes: BOTTOM_SIZES,
    colors: [
      { id: "beige", name: "Beige", hex: "#CDBB9C" },
      { id: "azul-marino", name: "Azul marino", hex: "#1F2A3C" },
    ],
  },
  {
    id: "polo-classic",
    name: "Polo Classic",
    category: "polos",
    tagline: "Más formal que una polera, más relajado que una camisa.",
    description:
      "Polo de piqué con cuello estructurado y tapeta de dos botones. Funciona con chinos y con jeans.",
    material: `Piqué. ${PENDING} (composición)`,
    fit: "Calce regular (pendiente de verificar)",
    care: PENDING,
    sizes: TOP_SIZES,
    colors: [
      { id: "azul-marino", name: "Azul marino", hex: "#1F2A3C" },
      { id: "crudo", name: "Crudo", hex: "#E9E2D3" },
    ],
  },
  {
    id: "camisa-oxford",
    name: "Camisa Oxford",
    category: "camisas",
    tagline: "La camisa que combina con todo.",
    description:
      "Camisa de tela oxford con cuello abotonado. Se usa abotonada, abierta sobre una polera o con las mangas recogidas.",
    material: `Tela oxford. ${PENDING} (composición)`,
    fit: "Calce regular (pendiente de verificar)",
    care: PENDING,
    sizes: TOP_SIZES,
    colors: [
      { id: "celeste", name: "Celeste", hex: "#B9CCE0" },
      { id: "blanco", name: "Blanco", hex: "#F7F6F2" },
    ],
  },
];

export const SEED_CAPSULE = {
  id: "frma-01",
  name: "FRMA 01",
  tagline: "7 piezas. 10 combinaciones. Tu ropero, resuelto.",
  description:
    "Un guardarropa base seleccionado para que todo combine con todo. Eliges tu talla de arriba y tu talla de pantalón, y listo.",
  price: PRICES["frma-01"],
  topSizes: TOP_SIZES,
  bottomSizes: BOTTOM_SIZES,
  pieces: [
    { productId: "polera-essential", variantSlug: "blanco", role: "top" },
    { productId: "polera-essential", variantSlug: "azul-marino", role: "top" },
    { productId: "polera-essential", variantSlug: "gris-carbon", role: "top" },
    { productId: "polo-classic", variantSlug: "crudo", role: "top" },
    { productId: "camisa-oxford", variantSlug: "celeste", role: "top" },
    { productId: "chino-everyday", variantSlug: "beige", role: "bottom" },
    { productId: "chino-everyday", variantSlug: "azul-marino", role: "bottom" },
  ] as { productId: string; variantSlug: string; role: "top" | "bottom" }[],
};

/** Los tres modelos ficticios de FRMA (editables en /admin/modelos). */
export const SEED_MODELS = [
  { name: "Modelo 1", age: 28, notes: "Rango 25–30 años." },
  { name: "Modelo 2", age: 36, notes: "Rango 31–39 años." },
  { name: "Modelo 3", age: 43, notes: "Rango 40–45 años." },
];
