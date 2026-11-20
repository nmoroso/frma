"use client";

import Link from "next/link";
import { CAPSULE, PRODUCTS } from "@/config/catalog";
import { capsuleItem, productItem } from "@/lib/analytics/items";
import { track } from "@/lib/analytics/track";
import { usePriceFn } from "@/lib/hooks";
import { ProductCard } from "@/components/product/ProductCard";
import { useViewItemList } from "@/components/product/useViewItemList";

const LIST = { id: "home_esenciales", name: "Home · Esenciales" };

export function HomeEssentials() {
  const priceOf = usePriceFn();
  useViewItemList(LIST, priceOf ? PRODUCTS.map((p, i) => productItem(p, priceOf(p.id), { list: LIST, index: i })) : null);
  return (
    <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
      {PRODUCTS.map((p, i) => (
        <ProductCard key={p.id} product={p} list={LIST} index={i} />
      ))}
    </div>
  );
}

const CAPSULE_LIST = { id: "home_capsula", name: "Home · Cápsula destacada" };

/** Enlace a la cápsula que registra select_item. */
export function CapsuleLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const priceOf = usePriceFn();
  return (
    <Link
      href="/frma-01"
      className={className}
      onClick={() =>
        priceOf &&
        track("select_item", {
          item_list_id: CAPSULE_LIST.id,
          item_list_name: CAPSULE_LIST.name,
          items: [capsuleItem(priceOf(CAPSULE.id), { list: CAPSULE_LIST, index: 0 })],
        })
      }
    >
      {children}
    </Link>
  );
}
