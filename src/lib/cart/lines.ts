import { collectionItem, productItem } from "../analytics/items";
import { findCollection, findProduct, shapeFor, variantBasePrice } from "../catalog/helpers";
import type { Catalog, CatalogImage, GarmentShape } from "../catalog/types";
import type { CartLine } from "./cart";

export type LineInfo = {
  name: string;
  detail: string;
  href: string;
  shape: GarmentShape;
  hex: string;
  image: CatalogImage | null;
  isCapsule: boolean;
  /** precio base (sin experimentos) */
  base: number;
};

/** Resuelve una línea del carrito contra el catálogo. null si ya no existe. */
export function lineInfo(line: CartLine, catalog: Catalog): LineInfo | null {
  if (line.kind === "capsule") {
    const c = findCollection(catalog, line.id);
    if (!c) return null;
    return {
      name: c.name,
      detail: `Talla superior ${line.topSize} · Pantalón ${line.bottomSize}`,
      href: c.id === "frma-01" ? "/frma-01" : `/guardarropa/${c.id}`,
      shape: "tee",
      hex: "#E9E3D8",
      image: c.heroImage ?? c.images[0] ?? null,
      isCapsule: true,
      base: c.price,
    };
  }
  const product = findProduct(catalog, line.id);
  const variant = product?.variants.find((v) => v.slug === line.colorId);
  if (!product || !variant) return null;
  return {
    name: product.name,
    detail: `${variant.name} · Talla ${line.size}`,
    href: `/producto/${product.id}?color=${variant.slug}`,
    shape: shapeFor(product.category),
    hex: variant.hex,
    image: variant.images[0] ?? null,
    isCapsule: false,
    base: variantBasePrice(product, variant),
  };
}

/** Ítem GA4 de una línea del carrito (con color y talla). */
export function lineAnalyticsItem(line: CartLine, catalog: Catalog, price: number, quantity = line.quantity) {
  if (line.kind === "capsule") {
    const c = findCollection(catalog, line.id);
    return c ? collectionItem(c, price, { topSize: line.topSize, bottomSize: line.bottomSize, quantity }) : null;
  }
  const product = findProduct(catalog, line.id);
  if (!product) return null;
  const variant = product.variants.find((v) => v.slug === line.colorId);
  return productItem(product, variant, price, { size: line.size, quantity });
}
