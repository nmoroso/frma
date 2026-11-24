"use client";

import Link from "next/link";
import { activeVariants, findCollection, MAIN_COLLECTION_ID, variantBasePrice } from "@/lib/catalog/helpers";
import { useCatalog } from "@/lib/catalog/context";
import { collectionItem, productItem } from "@/lib/analytics/items";
import { track } from "@/lib/analytics/track";
import { usePriceOf } from "@/lib/hooks";
import { ProductCard } from "@/components/product/ProductCard";
import { CapsuleCollage } from "@/components/product/CapsuleCollage";
import { Price } from "@/components/product/Price";
import { useViewItemList } from "@/components/product/useViewItemList";

const LIST = { id: "home_esenciales", name: "Home · Esenciales" };

export function HomeEssentials() {
  const catalog = useCatalog();
  const priceOf = usePriceOf();
  const products = catalog.products.slice(0, 8);
  useViewItemList(
    LIST,
    priceOf
      ? products.map((p, i) => {
          const v = activeVariants(p)[0];
          return productItem(p, v, priceOf(p.id, variantBasePrice(p, v)), { list: LIST, index: i });
        })
      : null,
  );
  return (
    <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} list={LIST} index={i} />
      ))}
    </div>
  );
}

const CAPSULE_LIST = { id: "home_capsula", name: "Home · Cápsula destacada" };

/** Enlace al guardarropa principal que registra select_item. */
export function CapsuleLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const catalog = useCatalog();
  const priceOf = usePriceOf();
  const c = findCollection(catalog, MAIN_COLLECTION_ID);
  return (
    <Link
      href={c ? "/frma-01" : "/catalogo"}
      className={className}
      onClick={() =>
        c &&
        priceOf &&
        track("select_item", {
          item_list_id: CAPSULE_LIST.id,
          item_list_name: CAPSULE_LIST.name,
          items: [collectionItem(c, priceOf(c.id, c.price), { list: CAPSULE_LIST, index: 0 })],
        })
      }
    >
      {children}
    </Link>
  );
}

/** Bloque del guardarropa destacado (imagen + precio). */
export function FeaturedCapsule() {
  const catalog = useCatalog();
  const c = findCollection(catalog, MAIN_COLLECTION_ID);
  if (!c) return null;
  const tops = c.pieces.filter((p) => p.role === "top").length;
  const bottoms = c.pieces.filter((p) => p.role === "bottom").length;
  return (
    <section className="bg-sand/50 py-16 sm:py-24">
      <div className="container-frma grid items-center gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
        <CapsuleCollage collection={c} image={catalog.home.wardrobe?.[0]?.image} className="aspect-[5/4]" />
        <div>
          <p className="eyebrow">Guardarropa cápsula</p>
          <h2 className="display mt-3">{c.name}</h2>
          <p className="mt-5 text-lg font-light">{c.tagline}</p>
          <div className="mt-8 grid grid-cols-3 border-y border-line py-5 text-center">
            <Stat n={c.pieces.length} label="piezas" />
            <Stat n={tops * bottoms} label="combinaciones" />
            <Stat n={1} label="decisión" />
          </div>
          <p className="mt-6 text-2xl">
            <Price id={c.id} base={c.price} />
          </p>
          <CapsuleLink className="btn-primary mt-6 w-full sm:w-auto">Ver {c.name}</CapsuleLink>
        </div>
      </div>
    </section>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <p className="text-3xl font-light">{n}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
    </div>
  );
}
