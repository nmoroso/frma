"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCatalog } from "@/lib/catalog/context";
import { findCollection, findProduct } from "@/lib/catalog/helpers";
import { LeadForm } from "@/components/forms/LeadForm";

export function PrelaunchClient() {
  const catalog = useCatalog();
  const params = useSearchParams();
  const nameOf = (id: string) => findCollection(catalog, id)?.name ?? findProduct(catalog, id)?.name;
  const fromCheckout = params.get("origen") === "checkout";
  const interest = (params.get("interes") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((id) => Boolean(nameOf(id)));

  const interestOptions = [
    { id: "general", label: "Todo FRMA" },
    ...catalog.collections.map((c) => ({ id: c.id, label: c.name })),
    ...catalog.products.map((p) => ({ id: p.id, label: p.name })),
  ];

  return (
    <div className="container-frma grid gap-12 py-12 sm:py-20 lg:grid-cols-2 lg:gap-20">
      <div>
        <p className="eyebrow">Prelanzamiento</p>
        <h1 className="display mt-3">
          {fromCheckout ? "Gracias por tu interés." : "FRMA llega pronto."}
        </h1>
        <div className="mt-8 border-l-2 border-ink pl-5">
          <p className="text-lg font-light leading-relaxed">
            FRMA todavía no recibe pedidos ni pagos.
          </p>
          <p className="mt-3 leading-relaxed text-muted">
            {fromCheckout
              ? "No se generó ningún pedido y no se realizó ningún cobro. Estamos preparando el lanzamiento y tu interés nos ayuda a decidir qué producir primero."
              : "Estamos preparando la primera colección. Si quieres, te avisamos cuando abramos los pedidos."}
          </p>
        </div>
        {fromCheckout && interest.length > 0 && (
          <p className="mt-6 text-sm text-muted">
            Te interesó: {interest.map((id) => nameOf(id)).join(", ")}.
            Tu carrito queda guardado en este navegador.
          </p>
        )}
        <Link href="/" className="link-underline mt-8 inline-block text-sm">Volver al inicio</Link>
      </div>
      <div className="bg-ivory p-6 sm:p-10">
        <h2 className="text-xl font-light">Recibe el aviso de lanzamiento</h2>
        <p className="mt-2 text-sm text-muted">Es voluntario. Solo te pediremos tu correo.</p>
        <div className="mt-6">
          <LeadForm options={interestOptions} defaultInterest={interest} origin={fromCheckout ? "checkout" : "prelanzamiento"} />
        </div>
      </div>
    </div>
  );
}
