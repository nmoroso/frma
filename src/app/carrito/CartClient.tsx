"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { subtotal } from "@/lib/cart/cart";
import { changeQuantity, removeFromCart } from "@/lib/cart/actions";
import { lineAnalyticsItem, lineInfo } from "@/lib/cart/lines";
import { useCatalog } from "@/lib/catalog/context";
import type { AnalyticsItem } from "@/lib/analytics/items";
import { track } from "@/lib/analytics/track";
import { formatCLP } from "@/lib/format";
import { useCart, useCartReady, useLinePrice } from "@/lib/hooks";
import { ProductVisual } from "@/components/product/ProductVisual";
import { CapsuleCollage } from "@/components/product/CapsuleCollage";
import { QuantityInput } from "@/components/ui/QuantityInput";

export function CartClient() {
  const lines = useCart();
  const ready = useCartReady();
  const catalog = useCatalog();
  const priceOf = useLinePrice();
  const viewed = useRef(false);

  useEffect(() => {
    if (!ready || !priceOf || viewed.current || lines.length === 0) return;
    viewed.current = true;
    track("view_cart", { items: lines.map((l) => lineAnalyticsItem(l, catalog, priceOf(l))).filter((x): x is AnalyticsItem => x !== null) });
    }, [ready, priceOf, lines, catalog]); // el ref evita repetir el evento

  if (!ready || !priceOf) return <div className="container-frma min-h-[50vh] pt-14" />;

  if (lines.length === 0) {
    return (
      <div className="container-frma py-24 text-center">
        <h1 className="h2">Tu carrito está vacío</h1>
        <p className="mt-3 text-muted">Empieza por lo esencial.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/frma-01" className="btn-primary">Ver FRMA 01</Link>
          <Link href="/catalogo" className="btn-secondary">Ir al catálogo</Link>
        </div>
      </div>
    );
  }

  const total = subtotal(lines, priceOf);

  return (
    <div className="container-frma pt-10 sm:pt-14">
      <h1 className="h2">Carrito</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-line border-y border-line">
          {lines.map((line) => {
            const info = lineInfo(line, catalog);
            if (!info) return null;
            const unit = priceOf(line);
            return (
              <li key={line.key} className="flex gap-4 py-5">
                <Link href={info.href} className="w-24 shrink-0 sm:w-28">
                  {info.isCapsule && !info.image ? (
                    <CapsuleCollage collection={catalog.collections.find((c) => c.id === line.id)!} className="aspect-[4/5]" />
                  ) : (
                    <ProductVisual shape={info.shape} hex={info.hex} image={info.image} alt={info.name} className="aspect-[4/5]" sizes="112px" />
                  )}
                </Link>
                <div className="flex flex-1 flex-col justify-between gap-3">
                  <div className="flex justify-between gap-3">
                    <div>
                      <Link href={info.href} className="font-medium hover:underline">{info.name}</Link>
                      <p className="mt-1 text-sm text-muted">{info.detail}</p>
                      <p className="mt-1 text-sm text-muted">{formatCLP(unit)} c/u</p>
                    </div>
                    <p className="text-sm tabular-nums">{formatCLP(unit * line.quantity)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <QuantityInput
                      value={line.quantity}
                      onChange={(q) => changeQuantity(line.key, q, catalog, priceOf)}
                      label={`Cantidad de ${info.name}`}
                    />
                    <button type="button" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline" onClick={() => removeFromCart(line.key, catalog, priceOf)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="h-fit bg-ivory p-6">
          <h2 className="text-sm font-medium uppercase tracking-[0.14em]">Resumen</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatCLP(total)}</dd>
            </div>
            <div className="flex justify-between text-muted">
              <dt>Despacho</dt>
              <dd>Se calcula después</dd>
            </div>
          </dl>
          <Link href="/checkout" className="btn-primary mt-6 w-full">Ir al checkout</Link>
          <Link href="/catalogo" className="btn-ghost mt-2 w-full">Seguir mirando</Link>
        </aside>
      </div>
    </div>
  );
}
