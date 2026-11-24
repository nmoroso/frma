"use client";

import Link from "next/link";
import { useState } from "react";
import { activeVariants, pickVariant, shapeFor, variantBasePrice } from "@/lib/catalog/helpers";
import type { Product } from "@/lib/catalog/types";
import { productItem } from "@/lib/analytics/items";
import { trackSelectColor } from "@/lib/analytics/color";
import { track } from "@/lib/analytics/track";
import { usePrice } from "@/lib/hooks";
import { ColorSwatches } from "./ColorSwatches";
import { Price } from "./Price";
import { ProductVisual } from "./ProductVisual";

export type ListInfo = { id: string; name: string };

export function ProductCard({
  product,
  list,
  index,
  initialColor,
}: {
  product: Product;
  list: ListInfo;
  index: number;
  initialColor?: string;
}) {
  const variants = activeVariants(product);
  const [slug, setSlug] = useState(pickVariant(product, initialColor)?.slug ?? "");
  const variant = pickVariant(product, slug);
  const base = variantBasePrice(product, variant);
  const price = usePrice(product.id, base);
  if (!variant) return null;
  const href = `/producto/${product.id}?color=${variant.slug}`;
  const image = variant.images[0];
  const hover = variant.images[1];

  const onSelect = () => {
    if (price === null) return;
    track("select_item", {
      item_list_id: list.id,
      item_list_name: list.name,
      items: [productItem(product, variant, price, { list, index })],
    });
  };

  return (
    <article className="group">
      <Link href={href} onClick={onSelect} className="relative block">
        <ProductVisual
          shape={shapeFor(product.category)}
          hex={variant.hex}
          image={image}
          alt={`${product.name} ${variant.name}`}
          className="aspect-[4/5]"
        />
        {hover && (
          <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden>
            <ProductVisual shape={shapeFor(product.category)} hex={variant.hex} image={hover} alt="" className="h-full w-full" />
          </div>
        )}
      </Link>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <Link href={href} onClick={onSelect} className="text-sm font-medium hover:underline">
            {product.name}
          </Link>
          <p className="mt-0.5 text-xs text-muted">{variant.name}</p>
        </div>
        <Price id={product.id} base={base} className="text-sm" />
      </div>
      {variants.length > 1 && (
        <div className="mt-2">
          <ColorSwatches
            variants={variants}
            selected={variant.slug}
            size="sm"
            label={`Colores de ${product.name}`}
            onSelect={(v) => {
              trackSelectColor(product, v, variant.slug, list);
              setSlug(v.slug);
            }}
          />
        </div>
      )}
    </article>
  );
}
