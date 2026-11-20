"use client";

import Link from "next/link";
import { useState } from "react";
import { getColor, type Product } from "@/config/catalog";
import { productItem } from "@/lib/analytics/items";
import { track } from "@/lib/analytics/track";
import { usePrice } from "@/lib/hooks";
import { Price } from "./Price";
import { ProductVisual } from "./ProductVisual";

export type ListInfo = { id: string; name: string };

export function ProductCard({
  product,
  list,
  index,
  initialColorId,
}: {
  product: Product;
  list: ListInfo;
  index: number;
  initialColorId?: string;
}) {
  const [colorId, setColorId] = useState(initialColorId ?? product.colors[0].id);
  const color = getColor(product, colorId);
  const price = usePrice(product.id);
  const href = `/producto/${product.slug}?color=${color.id}`;

  const onSelect = () => {
    if (price === null) return;
    track("select_item", {
      item_list_id: list.id,
      item_list_name: list.name,
      items: [productItem(product, price, { colorId: color.id, list, index })],
    });
  };

  return (
    <article className="group">
      <Link href={href} onClick={onSelect} className="block">
        <ProductVisual
          shape={product.shape}
          hex={color.hex}
          image={color.images[0]}
          alt={`${product.name} ${color.name}`}
          className="aspect-[4/5] transition-transform duration-500"
        />
      </Link>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <Link href={href} onClick={onSelect} className="text-sm font-medium hover:underline">
            {product.name}
          </Link>
          <p className="mt-0.5 text-xs text-muted">{color.name}</p>
        </div>
        <Price id={product.id} className="text-sm" />
      </div>
      <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label={`Colores de ${product.name}`}>
        {product.colors.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={c.id === color.id}
            aria-label={c.name}
            title={c.name}
            onClick={() => setColorId(c.id)}
            className={`h-5 w-5 rounded-full border transition ${c.id === color.id ? "ring-1 ring-ink ring-offset-2" : "border-line"}`}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>
    </article>
  );
}
