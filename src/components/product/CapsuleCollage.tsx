"use client";

import { collectionPieces, shapeFor } from "@/lib/catalog/helpers";
import { useCatalog } from "@/lib/catalog/context";
import type { CatalogImage, Collection } from "@/lib/catalog/types";
import { ProductVisual } from "./ProductVisual";

/** Imagen del guardarropa: foto configurada en el panel o composición de sus piezas. */
export function CapsuleCollage({
  collection,
  image,
  className = "",
  priority = false,
}: {
  collection: Collection;
  image?: CatalogImage | null;
  className?: string;
  priority?: boolean;
}) {
  const catalog = useCatalog();
  const hero = image ?? collection.heroImage;
  if (hero) {
    return <ProductVisual shape="tee" hex="#E9E3D8" image={hero} alt={hero.alt || collection.name} className={className} priority={priority} sizes="(min-width:1024px) 55vw, 100vw" />;
  }
  const pieces = collectionPieces(catalog, collection);
  const tops = pieces.filter((p) => p.role === "top");
  const bottoms = pieces.filter((p) => p.role === "bottom");
  return (
    <div
      className={`grid gap-1.5 bg-paper ${className}`}
      style={{ gridTemplateColumns: `repeat(${Math.max(1, tops.length)}, minmax(0, 1fr))`, gridTemplateRows: bottoms.length ? "1fr 1fr" : "1fr" }}
      aria-label={`Piezas de ${collection.name}`}
      role="img"
    >
      {tops.map((p, i) => (
        <ProductVisual key={`t-${i}`} shape={shapeFor(p.product.category)} hex={p.variant.hex} image={p.variant.images[0]} alt={`${p.product.name} ${p.variant.name}`} sizes="20vw" />
      ))}
      {bottoms.map((p, i) => {
        const cols = Math.max(1, tops.length);
        const span = Math.max(1, Math.floor(cols / bottoms.length) + (i < cols % bottoms.length ? 1 : 0));
        return (
          <div key={`b-${i}`} style={{ gridColumn: `span ${span} / span ${span}` }}>
            <ProductVisual
              shape={shapeFor(p.product.category)}
              hex={p.variant.hex}
              image={p.variant.images[0]}
              alt={`${p.product.name} ${p.variant.name}`}
              className="h-full w-full"
              sizes="40vw"
            />
          </div>
        );
      })}
    </div>
  );
}
