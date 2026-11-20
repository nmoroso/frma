"use client";

import { MAX_QTY } from "@/lib/cart/cart";

export function QuantityInput({
  value,
  onChange,
  label,
  min = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  min?: number;
}) {
  return (
    <div className="flex h-12 items-center border border-line" role="group" aria-label={label}>
      <button
        type="button"
        className="h-full w-10 text-lg disabled:text-muted/40"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Disminuir cantidad"
      >
        −
      </button>
      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{value}</span>
      <button
        type="button"
        className="h-full w-10 text-lg disabled:text-muted/40"
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_QTY}
        aria-label="Aumentar cantidad"
      >
        +
      </button>
    </div>
  );
}
