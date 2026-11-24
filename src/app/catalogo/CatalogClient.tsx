"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { activeVariants, allColors, colorKey, usedCategories, variantBasePrice } from "@/lib/catalog/helpers";
import { useCatalog } from "@/lib/catalog/context";
import type { Product } from "@/lib/catalog/types";
import { collectionItem, productItem } from "@/lib/analytics/items";
import { track } from "@/lib/analytics/track";
import { formatCLP } from "@/lib/format";
import { usePriceOf, type PriceOf } from "@/lib/hooks";
import { ProductCard } from "@/components/product/ProductCard";
import { Price } from "@/components/product/Price";
import { CapsuleCollage } from "@/components/product/CapsuleCollage";
import { useViewItemList } from "@/components/product/useViewItemList";

const PRICE_RANGES = [
  { id: "hasta-25000", label: `Hasta ${formatCLP(25000)}`, min: 0, max: 25000 },
  { id: "25000-40000", label: `${formatCLP(25000)} – ${formatCLP(40000)}`, min: 25000, max: 40000 },
  { id: "mas-40000", label: `Más de ${formatCLP(40000)}`, min: 40000, max: Infinity },
];

const LIST = { id: "catalogo", name: "Catálogo" };

/** Variantes que cumplen el filtro de color (o todas). */
function matchingVariants(p: Product, color: string) {
  return activeVariants(p).filter((v) => !color || colorKey(v.name) === color);
}

/** ¿Algún color del producto cae en el rango de precio? */
function priceMatches(p: Product, color: string, range: { min: number; max: number } | undefined, priceOf: PriceOf | null) {
  if (!range) return true;
  if (!priceOf) return true;
  return matchingVariants(p, color).some((v) => inRange(priceOf(p.id, variantBasePrice(p, v)), range));
}

export function CatalogClient() {
  const catalog = useCatalog();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const priceOf = usePriceOf();

  const category = params.get("categoria") ?? "todo";
  const color = params.get("color") ?? "";
  const range = PRICE_RANGES.find((r) => r.id === params.get("precio"));

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const categories = usedCategories(catalog);
  const collections = (category === "todo" || category === "capsulas") && !color
    ? catalog.collections.filter((c) => !range || !priceOf || inRange(priceOf(c.id, c.price), range))
    : [];

  const products =
    category === "capsulas"
      ? []
      : catalog.products.filter((p) => {
          if (category === "camisas" && !(p.category === "camisas" || p.category === "polos")) return false;
          if (category !== "todo" && category !== "camisas" && p.category !== category) return false;
          if (color && matchingVariants(p, color).length === 0) return false;
          return priceMatches(p, color, range, priceOf);
        });

  const initialSlug = (p: Product) => (color ? matchingVariants(p, color)[0]?.slug : undefined);
  const listItems = priceOf
    ? [
        ...collections.map((c, i) => collectionItem(c, priceOf(c.id, c.price), { list: LIST, index: i })),
        ...products.map((p, i) => {
          const v = activeVariants(p).find((x) => x.slug === initialSlug(p)) ?? activeVariants(p)[0];
          return productItem(p, v, priceOf(p.id, variantBasePrice(p, v)), { list: LIST, index: i + collections.length });
        }),
      ]
    : null;
  useViewItemList(LIST, listItems);

  const total = products.length + collections.length;
  const activeFilters = category !== "todo" || color || range;
  const filterCategories = [
    { id: "todo", name: "Todo" },
    ...(catalog.collections.length ? [{ id: "capsulas", name: "Cápsulas" }] : []),
    ...categories.filter((c) => c.id !== "polos" || !categories.some((x) => x.id === "camisas")).map((c) => (c.id === "camisas" && categories.some((x) => x.id === "polos") ? { ...c, name: "Camisas y polos" } : c)),
  ];

  return (
    <div className="container-frma pt-10 sm:pt-14">
      <p className="eyebrow">Catálogo</p>
      <h1 className="display mt-3">Prendas esenciales</h1>
      <p className="mt-4 max-w-xl text-muted">Pocas piezas, bien elegidas. Todo está pensado para combinar entre sí.</p>

      <section aria-label="Filtros" className="mt-10 space-y-5 border-y border-line py-6">
        <FilterRow label="Categoría">
          {filterCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              className={`chip ${category === c.id ? "chip-active" : ""}`}
              onClick={() => setParam("categoria", c.id === "todo" ? null : c.id)}
            >
              {c.name}
            </button>
          ))}
        </FilterRow>
        <FilterRow label="Color">
          {allColors(catalog).map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={color === c.key}
              className={`chip gap-2 ${color === c.key ? "chip-active" : ""}`}
              onClick={() => setParam("color", color === c.key ? null : c.key)}
            >
              <span className="h-3.5 w-3.5 rounded-full border border-ink/25" style={{ backgroundColor: c.hex }} />
              {c.name}
            </button>
          ))}
        </FilterRow>
        <FilterRow label="Precio">
          {PRICE_RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={range?.id === r.id}
              className={`chip ${range?.id === r.id ? "chip-active" : ""}`}
              onClick={() => setParam("precio", range?.id === r.id ? null : r.id)}
            >
              {r.label}
            </button>
          ))}
        </FilterRow>
        <div className="flex items-center justify-between text-sm text-muted">
          <span aria-live="polite">{total} {total === 1 ? "resultado" : "resultados"}</span>
          {activeFilters && (
            <button type="button" className="link-underline" onClick={() => router.replace(pathname, { scroll: false })}>
              Limpiar filtros
            </button>
          )}
        </div>
      </section>

      {collections.map((c, i) => (
        <Link
          key={c.id}
          href={c.id === "frma-01" ? "/frma-01" : `/guardarropa/${c.id}`}
          onClick={() => priceOf && track("select_item", { item_list_id: LIST.id, item_list_name: LIST.name, items: [collectionItem(c, priceOf(c.id, c.price), { list: LIST, index: i })] })}
          className="mt-10 grid items-center gap-6 bg-ivory p-4 sm:grid-cols-2 sm:p-8"
        >
          <CapsuleCollage collection={c} className="aspect-[4/3]" />
          <div className="sm:pl-6">
            <p className="eyebrow">Guardarropa cápsula</p>
            <p className="h2 mt-2">{c.name}</p>
            <p className="mt-2 text-muted">{c.tagline}</p>
            <p className="mt-4 text-lg"><Price id={c.id} base={c.price} /></p>
            <span className="link-underline mt-4 inline-block text-sm">Ver la cápsula</span>
          </div>
        </Link>
      ))}

      {products.length > 0 ? (
        <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard key={`${p.id}-${color}`} product={p} list={LIST} index={i + collections.length} initialColor={initialSlug(p)} />
          ))}
        </div>
      ) : (
        collections.length === 0 && <p className="py-20 text-center text-muted">No hay productos con estos filtros.</p>
      )}
    </div>
  );
}

function inRange(price: number, r: { min: number; max: number }) {
  return price >= r.min && price < r.max;
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
      <span className="eyebrow w-24 shrink-0">{label}</span>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">{children}</div>
    </div>
  );
}
