"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { collectionOutfits, collectionPieces, findCollection, shapeFor, variantBasePrice } from "@/lib/catalog/helpers";
import { useCatalog } from "@/lib/catalog/context";
import { collectionItem } from "@/lib/analytics/items";
import { track } from "@/lib/analytics/track";
import { addToCart } from "@/lib/cart/actions";
import { formatCLP } from "@/lib/format";
import { usePriceOf } from "@/lib/hooks";
import { CapsuleCollage } from "@/components/product/CapsuleCollage";
import { ProductVisual } from "@/components/product/ProductVisual";

export function CollectionDetail({ collectionId }: { collectionId: string }) {
  const catalog = useCatalog();
  const CAPSULE = findCollection(catalog, collectionId)!;
  const priceOf = usePriceOf();
  const pieces = collectionPieces(catalog, CAPSULE);
  const outfits = collectionOutfits(catalog, CAPSULE);
  const [topSize, setTopSize] = useState("");
  const [bottomSize, setBottomSize] = useState("");
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const viewed = useRef(false);

  const capsulePrice = priceOf ? priceOf(CAPSULE.id, CAPSULE.price) : null;
  const separate = priceOf ? pieces.reduce((s, p) => s + priceOf(p.product.id, variantBasePrice(p.product, p.variant)), 0) : null;
  const saving = capsulePrice !== null && separate !== null ? separate - capsulePrice : null;

  useEffect(() => {
    if (capsulePrice === null || viewed.current) return;
    viewed.current = true;
    track("view_item", { items: [collectionItem(CAPSULE, capsulePrice)] });
  }, [capsulePrice, CAPSULE]);

  const onAdd = () => {
    if (!topSize || !bottomSize) {
      setError("Elige tu talla superior y tu talla de pantalón.");
      return;
    }
    if (capsulePrice === null) return;
    setError("");
    addToCart({ id: CAPSULE.id, kind: "capsule", topSize, bottomSize, quantity: 1 }, collectionItem(CAPSULE, capsulePrice, { topSize, bottomSize }));
    setAdded(true);
  };

  return (
    <>
      <section className="container-frma grid gap-8 pt-6 sm:pt-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
        <CapsuleCollage collection={CAPSULE} className="aspect-[5/4] w-full" priority />
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">Guardarropa cápsula</p>
          <h1 className="display mt-3">{CAPSULE.name}</h1>
          <p className="mt-4 text-lg font-light">{CAPSULE.tagline}</p>
          <p className="mt-3 leading-relaxed text-muted">{CAPSULE.description}</p>

          <div className="mt-8 border-y border-line py-5">
            {capsulePrice === null ? (
              <div className="h-14 animate-pulse bg-stone" />
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted">Comprando las {pieces.length} piezas por separado</span>
                  <span className="text-muted line-through">{formatCLP(separate!)}</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-sm font-medium">Precio {CAPSULE.name}</span>
                  <span className="text-2xl">{formatCLP(capsulePrice)}</span>
                </div>
                {saving! > 0 && (
                  <p className="mt-2 text-right text-sm text-accent">
                    Ahorras {formatCLP(saving!)} ({Math.round((saving! / separate!) * 100)}%)
                  </p>
                )}
              </>
            )}
          </div>

          <SizePicker label="Talla superior (poleras, polo y camisa)" sizes={CAPSULE.topSizes} value={topSize} onChange={(v) => { setTopSize(v); setError(""); setAdded(false); }} />
          <SizePicker label="Talla de pantalón (chinos)" sizes={CAPSULE.bottomSizes} value={bottomSize} onChange={(v) => { setBottomSize(v); setError(""); setAdded(false); }} />
          {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}

          <button type="button" className="btn-primary mt-6 w-full" onClick={onAdd} disabled={capsulePrice === null}>
            Agregar {CAPSULE.name} al carrito
          </button>
          {added && (
            <div className="mt-4 flex items-center justify-between border border-line bg-ivory p-4 text-sm" role="status">
              <span>{CAPSULE.name} agregada al carrito.</span>
              <Link href="/carrito" className="link-underline font-medium">Ver carrito</Link>
            </div>
          )}
          <p className="mt-4 text-xs text-muted">Guía de tallas y materiales pendientes de confirmación.</p>
        </div>
      </section>

      <section className="container-frma mt-24">
        <p className="eyebrow">Qué incluye</p>
        <h2 className="h2 mt-2">{pieces.length} piezas</h2>
        <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-4 lg:grid-cols-7">
          {pieces.map((p, i) => (
            <li key={i}>
              <Link href={`/producto/${p.product.id}?color=${p.variant.slug}`} className="block">
                <ProductVisual shape={shapeFor(p.product.category)} hex={p.variant.hex} image={p.variant.images[0]} alt={`${p.product.name} ${p.variant.name}`} className="aspect-[4/5]" sizes="(min-width:1024px) 14vw, 50vw" />
                <p className="mt-2 text-sm">{p.product.name}</p>
                <p className="text-xs text-muted">{p.variant.name}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {CAPSULE.images.length > 0 && (
        <section className="container-frma mt-24" aria-label={`Fotos de ${CAPSULE.name}`}>
          <p className="eyebrow">Cómo se usa</p>
          <h2 className="h2 mt-2">{CAPSULE.name} en la calle</h2>
          <div className="mt-8 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
            {CAPSULE.images.map((img, i) => (
              <ProductVisual key={img.src} shape="tee" hex="#E9E3D8" image={img} alt={img.alt || `${CAPSULE.name} foto ${i + 1}`} className={i === 0 ? "col-span-2 aspect-[4/3] lg:col-span-2 lg:row-span-2 lg:aspect-auto" : "aspect-[4/5]"} sizes="(min-width:1024px) 33vw, 50vw" />
            ))}
          </div>
        </section>
      )}

      <section className="mt-24 bg-ivory py-16 sm:py-20">
        <div className="container-frma">
          <p className="eyebrow">Combinaciones</p>
          <h2 className="h2 mt-2">{outfits.length} outfits básicos</h2>
          <p className="mt-3 max-w-xl text-muted">
            {pieces.filter((p) => p.role === "top").length} prendas superiores × {pieces.filter((p) => p.role === "bottom").length} pantalones. Todo combina con todo: elige cualquiera de arriba y cualquiera de abajo.
          </p>
          <ol className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {outfits.map((o, i) => (
              <li key={o.id} className="bg-paper p-3">
                <div className="grid grid-rows-[1fr_1fr] gap-1">
                  <ProductVisual shape={shapeFor(o.top.product.category)} hex={o.top.variant.hex} image={o.top.variant.images[0]} alt={`${o.top.product.name} ${o.top.variant.name}`} className="aspect-[5/4]" sizes="20vw" />
                  <ProductVisual shape={shapeFor(o.bottom.product.category)} hex={o.bottom.variant.hex} image={o.bottom.variant.images[0]} alt={`${o.bottom.product.name} ${o.bottom.variant.name}`} className="aspect-[5/4]" sizes="20vw" />
                </div>
                <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-muted">Look {String(i + 1).padStart(2, "0")}</p>
                <p className="mt-1 text-sm leading-snug">
                  {o.top.product.name} {o.top.variant.name.toLowerCase()} + {o.bottom.product.name} {o.bottom.variant.name.toLowerCase()}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-frma mt-20 text-center">
        <h2 className="h2">Menos decisiones. Mejor resultado.</h2>
        <p className="mx-auto mt-3 max-w-md text-muted">Un guardarropa base para la semana, listo para combinar.</p>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="btn-primary mt-8">
          Elegir mis tallas
        </button>
      </section>
    </>
  );
}

function SizePicker({ label, sizes, value, onChange }: { label: string; sizes: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-6">
      <p className="text-sm">{label}</p>
      <div className="mt-3 grid grid-cols-6 gap-2" role="radiogroup" aria-label={label}>
        {sizes.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={value === s} onClick={() => onChange(s)} className={`chip justify-center px-0 ${value === s ? "chip-active" : ""}`}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
