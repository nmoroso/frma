"use client";

import { formatCLP } from "@/lib/format";
import { usePrice } from "@/lib/hooks";

/** Muestra el precio (respeta experimentos de precio sin parpadeos). */
export function Price({ id, base, className = "" }: { id: string; base: number; className?: string }) {
  const price = usePrice(id, base);
  if (price === null) return <span className={`inline-block h-[1em] w-20 animate-pulse bg-stone align-middle ${className}`} aria-label="Cargando precio" />;
  return <span className={className}>{formatCLP(price)}</span>;
}
