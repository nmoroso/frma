"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { activeVariants, findProduct, pickVariant, shapeFor, variantBasePrice } from "@/lib/catalog/helpers";
import { useCatalog } from "@/lib/catalog/context";
import { productItem } from "@/lib/analytics/items";
import { trackSelectColor } from "@/lib/analytics/color";
import { track } from "@/lib/analytics/track";
import { addToCart } from "@/lib/cart/actions";
import { usePrice } from "@/lib/hooks";
import { ColorSwatches } from "@/components/product/ColorSwatches";
import { Price } from "@/components/product/Price";
import { ProductVisual } from "@/components/product/ProductVisual";
import { QuantityInput } from "@/components/ui/QuantityInput";

export function ProductDetail({ productId }: { productId: string }) {
  const catalog = useCatalog();
  const product = findProduct(catalog, productId)!;
  const params = useSearchParams();
  const [slug, setSlug] = useState(() => pickVariant(product, params.get("color"))?.slug ?? "");
  const variant = pickVariant(product, slug)!;
  const variants = activeVariants(product);
  const base = variantBasePrice(product, variant);
  const price = usePrice(product.id, base);
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [active, setActive] = useState(0);
  const viewed = useRef(false);

  // view_item una sola vez por visita a la ficha, con el color mostrado.
  useEffect(() => {
    if (price === null || viewed.current) return;
    viewed.current = true;
    track("view_item", { items: [productItem(product, variant, price)] });
  }, [price, product, variant]);

  const selectColor = (v: typeof variant) => {
    trackSelectColor(product, v, variant.slug);
    setSlug(v.slug);
    setActive(0);
    setAdded(false);
    if (size && !v.sizes.includes(size)) setSize("");
    // Misma página: solo actualizamos la URL para poder compartir el color.
    const url = new URL(window.location.href);
    url.searchParams.set("color", v.slug);
    window.history.replaceState(null, "", url);
  };

  const onAdd = () => {
    if (!size) {
      setError("Elige una talla para continuar.");
      return;
    }
    if (price === null) return;
    setError("");
    addToCart(
      { id: product.id, kind: "product", colorId: variant.slug, size, quantity: qty },
      productItem(product, variant, price, { size, quantity: qty }),
    );
    setAdded(true);
  };

  const images = variant.images;
  const current = images[active] ?? images[0];
  const shape = shapeFor(product.category);
  const inCollection = catalog.collections.find((c) => c.pieces.some((p) => p.productId === product.id));

  return (
    <div className="container-frma pt-6 sm:pt-10">
      <nav aria-label="Ruta" className="mb-6 text-xs text-muted">
        <Link href="/catalogo" className="hover:text-ink">Catálogo</Link> <span aria-hidden>/</span>{" "}
        <span className="text-ink">{product.name}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
        {/* Galería: solo las fotos del color seleccionado */}
        <div>
          <ProductVisual
            key={current?.src ?? variant.id}
            shape={shape}
            hex={variant.hex}
            image={current}
            alt={current?.alt || `${product.name} ${variant.name}`}
            className="aspect-[4/5] w-full"
            label
            priority
            sizes="(min-width: 1024px) 55vw, 100vw"
          />
          {images.length > 1 && (
            <div className="mt-2 grid grid-cols-5 gap-2" aria-label="Fotos del producto">
              {images.map((img, i) => (
                <button
                  key={`${variant.id}-${img.src}`}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Ver foto ${i + 1} de ${images.length}`}
                  aria-current={i === active}
                  className={`outline-offset-2 ${i === active ? "ring-1 ring-ink" : "opacity-80 hover:opacity-100"}`}
                >
                  <ProductVisual shape={shape} hex={variant.hex} image={img} alt="" className="aspect-[4/5]" sizes="12vw" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          {product.tagline && <p className="eyebrow">{product.tagline}</p>}
          <h1 className="mt-3 text-3xl font-light tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-3 text-xl"><Price id={product.id} base={base} /></p>

          <div className="mt-8">
            <p className="text-sm" aria-live="polite">
              Color: <span className="text-muted">{variant.name}</span>
            </p>
            {variants.length > 0 && (
              <div className="mt-3">
                <ColorSwatches variants={variants} selected={variant.slug} onSelect={selectColor} label="Color" size="lg" />
              </div>
            )}
          </div>

          <div className="mt-8">
            <div className="flex items-baseline justify-between">
              <p className="text-sm">Talla</p>
              <span className="text-xs text-muted">Guía de tallas: pendiente</span>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6" role="radiogroup" aria-label="Talla">
              {variant.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={size === s}
                  onClick={() => {
                    setSize(s);
                    setError("");
                    setAdded(false);
                  }}
                  className={`chip justify-center px-0 ${size === s ? "chip-active" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
            {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
          </div>

          <div className="mt-8 flex gap-3">
            <QuantityInput value={qty} onChange={setQty} label={`Cantidad de ${product.name}`} />
            <button type="button" className="btn-primary flex-1" onClick={onAdd} disabled={price === null}>
              Agregar al carrito
            </button>
          </div>
          {added && (
            <div className="mt-4 flex items-center justify-between border border-line bg-ivory p-4 text-sm" role="status">
              <span>Agregado al carrito: {variant.name}, talla {size}.</span>
              <Link href="/carrito" className="link-underline font-medium">Ver carrito</Link>
            </div>
          )}

          {product.description && (
            <div className="mt-10 border-t border-line pt-6">
              <p className="whitespace-pre-line leading-relaxed text-ink/85">{product.description}</p>
            </div>
          )}

          <dl className="mt-6 divide-y divide-line border-y border-line text-sm">
            {[
              ["Material y composición", product.material],
              ["Características y calce", product.fit],
              ["Cuidados", product.care],
            ]
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label} className="flex justify-between gap-6 py-3">
                  <dt className="shrink-0 text-muted">{label}</dt>
                  <dd className={`text-right ${value.toLowerCase().includes("pendiente") ? "italic text-muted" : ""}`}>{value}</dd>
                </div>
              ))}
          </dl>

          {inCollection && (
            <Link href={inCollection.id === "frma-01" ? "/frma-01" : `/guardarropa/${inCollection.id}`} className="mt-8 block bg-ivory p-5 text-sm hover:bg-sand/60">
              <span className="eyebrow">Ahorra con la cápsula</span>
              <span className="mt-2 block">
                {product.name} es parte de <strong className="font-medium">{inCollection.name}</strong>: piezas que combinan entre sí.
              </span>
              <span className="link-underline mt-2 inline-block">Ver {inCollection.name}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
