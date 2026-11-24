import { SEED_CAPSULE, SEED_PRODUCTS } from "@/config/catalog";
import { PRICES } from "@/config/pricing";
import { HOME } from "@/config/home";
import type { Catalog, HomeImages } from "./types";

export function seedSku(productId: string, colorId: string) {
  return `${productId}-${colorId}`.toUpperCase();
}

/** Catálogo inicial (config) con la forma del catálogo administrable. */
export function seedCatalog(): Catalog {
  const home: HomeImages = {};
  if (HOME.hero.image) {
    home.hero = [
      {
        image: { id: null, src: HOME.hero.image.src, alt: HOME.hero.image.alt, conceptual: Boolean(HOME.hero.image.conceptual), kind: "editorial", width: null, height: null },
        title: "",
        subtitle: "",
        href: "",
      },
    ];
  }
  return {
    source: "seed",
    products: SEED_PRODUCTS.map((p, i) => ({
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
      sortOrder: (i + 1) * 10,
      variants: p.colors.map((c) => ({
        id: `seed:${p.id}:${c.id}`,
        slug: c.id,
        name: c.name,
        hex: c.hex,
        sku: seedSku(p.id, c.id),
        sizes: p.sizes,
        ownSizes: false,
        price: null,
        active: true,
        images: [],
      })),
    })),
    collections: [
      {
        id: SEED_CAPSULE.id,
        name: SEED_CAPSULE.name,
        tagline: SEED_CAPSULE.tagline,
        description: SEED_CAPSULE.description,
        price: SEED_CAPSULE.price,
        status: "published",
        topSizes: SEED_CAPSULE.topSizes,
        bottomSizes: SEED_CAPSULE.bottomSizes,
        pieces: SEED_CAPSULE.pieces,
        heroImage: null,
        images: [],
        sortOrder: 10,
      },
    ],
    home,
  };
}
