"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SITE } from "@/config/site";
import { subtotal } from "@/lib/cart/cart";
import { lineItem } from "@/lib/cart/actions";
import { track } from "@/lib/analytics/track";
import { formatCLP } from "@/lib/format";
import { useCart, useCartReady, usePriceFn } from "@/lib/hooks";
import { lineInfo } from "@/components/cart/lineInfo";

export function CheckoutClient() {
  const lines = useCart();
  const ready = useCartReady();
  const priceOf = usePriceFn();
  const router = useRouter();
  const started = useRef(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!ready || !priceOf || started.current || lines.length === 0) return;
    started.current = true;
    track("begin_checkout", { items: lines.map((l) => lineItem(l, priceOf(l.id))) });
  }, [ready, priceOf, lines]);

  if (!ready || !priceOf) return <div className="container-frma min-h-[50vh] pt-14" />;

  if (lines.length === 0) {
    return (
      <div className="container-frma py-24 text-center">
        <h1 className="h2">No hay productos en tu carrito</h1>
        <Link href="/catalogo" className="btn-primary mt-8">Ir al catálogo</Link>
      </div>
    );
  }

  const total = subtotal(lines, priceOf);

  const onContinue = () => {
    if (sending) return;
    setSending(true);
    const items = lines.map((l) => lineItem(l, priceOf(l.id)));
    // Evento final del embudo: intención de compra (NO es una compra).
    track("purchase_intent", { items, value: total });
    const interest = [...new Set(lines.map((l) => l.id))].join(",");
    router.push(`/prelanzamiento?origen=checkout&interes=${encodeURIComponent(interest)}`);
  };

  return (
    <div className="container-frma pt-10 sm:pt-14">
      <p className="eyebrow">Checkout</p>
      <h1 className="h2 mt-2">Revisa tu pedido</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <section aria-label="Productos">
          <ul className="divide-y divide-line border-y border-line">
            {lines.map((l) => {
              const info = lineInfo(l);
              return (
                <li key={l.key} className="flex justify-between gap-4 py-4 text-sm">
                  <div>
                    <p className="font-medium">
                      {info.name} <span className="font-normal text-muted">× {l.quantity}</span>
                    </p>
                    <p className="mt-1 text-muted">{info.detail}</p>
                  </div>
                  <p className="tabular-nums">{formatCLP(priceOf(l.id) * l.quantity)}</p>
                </li>
              );
            })}
          </ul>
          <Link href="/carrito" className="link-underline mt-4 inline-block text-sm">Editar carrito</Link>

          <div className="mt-10 border border-line p-5">
            <p className="text-sm font-medium">Despacho</p>
            <p className="mt-2 text-sm">
              Estimado: <span className="text-muted">{SITE.shipping.estimate}</span>
            </p>
            <p className="mt-2 text-sm text-muted">{SITE.shipping.note}</p>
          </div>
        </section>

        <aside className="h-fit bg-ivory p-6">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatCLP(total)}</dd>
            </div>
            <div className="flex justify-between text-muted">
              <dt>Despacho</dt>
              <dd>{SITE.shipping.estimate}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base">
              <dt>Total productos</dt>
              <dd className="tabular-nums">{formatCLP(total)}</dd>
            </div>
          </dl>
          <button type="button" className="btn-primary mt-6 w-full" onClick={onContinue} disabled={sending}>
            Continuar con mi pedido
          </button>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            No te pediremos datos de pago en este paso.
          </p>
        </aside>
      </div>
    </div>
  );
}
