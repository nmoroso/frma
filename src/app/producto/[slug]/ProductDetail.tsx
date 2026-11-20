"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CAPSULE, getColor, getProductBySlug } from "@/config/catalog";
import { productItem } from "@/lib/analytics/items";
import { track } from "@/lib/analytics/track";
import { addToCart } from "@/lib/cart/actions";
import { usePrice } from "@/lib/hooks";
import { Price } from "@/components/product/Price";
import { ProductVisual } from "@/components/product/ProductVisual";
import { QuantityInput } from "@/components/ui/QuantityInput";

export function ProductDetail({ slug }: { slug: string }) {
  const product = getProductBySlug(slug)!;
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const color = getColor(product, params.get("color") ?? undefined);
  const price = usePrice(product.id);
  const [size, setSize] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [active, setActive] = useState(0);
  const viewed = useRef(false);

  useEffect(() => {
    if (price === null || viewed.current) return;
    viewed.current = true;
    track("view_item", { items: [productItem(product, price, { colorId: color.id })] });
  }, [price, product, color.id]);

  const selectColor = (id: string) => {
    setActive(0);
    setAdded(false);
    router.replace(`${pathname}?color=${id}`, { scroll: false });
  };

  const onAdd = () => {
    if (!size) {
      setError("Elige una talla para continuar.");
      return;
    }
    if (price === null) return;
    setError("");
    addToCart({ id: product.id, kind: "product", colorId: color.id, size, quantity: qty }, price);
    setAdded(true);
  };

  const images = color.images;
  const current = images[active];

  return (
    <div className="container-frma pt-6 sm:pt-10">
      <nav aria-label="Ruta" className="mb-6 text-xs text-muted">
        <Link href="/catalogo" className="hover:text-ink">Catálogo</Link> <span aria-hidden>/</span>{" "}
        <span className="text-ink">{product.name}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
        {/* Galería */}
        <div>
          <ProductVisual
            shape={product.shape}
            hex={color.hex}
            image={current}
            alt={`${product.name} ${color.name}`}
            className="aspect-[4/5] w-full"
            label
            priority
            sizes="(min-width: 1024px) 55vw, 100vw"
          />
          {images.length > 1 && (
            <div className="mt-2 grid grid-cols-5 gap-2">
              {images.map((img, i) => (
                <button key={img.src} type="button" onClick={() => setActive(i)} aria-label={`Ver imagen ${i + 1}`} className={i === active ? "ring-1 ring-ink" : ""}>
                  <ProductVisual shape={product.shape} hex={color.hex} image={img} alt={img.alt} className="aspect-square" sizes="10vw" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">{product.tagline}</p>
          <h1 className="mt-3 text-3xl font-light tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-3 text-xl"><Price id={product.id} /></p>

          <div className="mt-8">
            <p className="text-sm">
              Color: <span className="text-muted">{color.name}</span>
            </p>
            <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Color">
              {product.colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={c.id === color.id}
                  aria-label={c.name}
                  onClick={() => selectColor(c.id)}
                  className={`h-9 w-9 rounded-full border border-line ${c.id === color.id ? "ring-1 ring-ink ring-offset-2" : ""}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-baseline justify-between">
              <p className="text-sm">Talla</p>
              <span className="text-xs text-muted">Guía de tallas: pendiente</span>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6" role="radiogroup" aria-label="Talla">
              {product.sizes.map((s) => (
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
              <span>Agregado al carrito.</span>
              <Link href="/carrito" className="link-underline font-medium">Ver carrito</Link>
            </div>
          )}

          <div className="mt-10 border-t border-line pt-6">
            <p className="leading-relaxed text-ink/85">{product.description}</p>
          </div>

          <dl className="mt-6 divide-y divide-line border-y border-line text-sm">
            {product.details.map((d) => (
              <div key={d.label} className="flex justify-between gap-4 py-3">
                <dt className="text-muted">{d.label}</dt>
                <dd className={d.value.toLowerCase().includes("pendiente") ? "text-muted italic" : ""}>{d.value}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-muted">Cuidados</dt>
              <dd className={product.care.toLowerCase().includes("pendiente") ? "text-muted italic" : ""}>{product.care}</dd>
            </div>
          </dl>

          <Link href="/frma-01" className="mt-8 block bg-ivory p-5 text-sm hover:bg-sand/60">
            <span className="eyebrow">Ahorra con la cápsula</span>
            <span className="mt-2 block">
              {product.name} es parte de <strong className="font-medium">{CAPSULE.name}</strong>: 7 piezas que combinan entre sí.
            </span>
            <span className="link-underline mt-2 inline-block">Ver {CAPSULE.name}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
