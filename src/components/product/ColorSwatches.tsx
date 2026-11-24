"use client";

import { useRef } from "react";
import { isLight } from "@/lib/catalog/helpers";
import type { Variant } from "@/lib/catalog/types";

/**
 * Selector de color circular (radiogroup accesible).
 * - El HEX de cada variante define el color del círculo.
 * - Los colores claros tienen borde visible.
 * - El seleccionado se marca con un anillo exterior.
 * - Teclado: Tab entra al grupo, flechas cambian de color, Inicio/Fin.
 */
export function ColorSwatches({
  variants,
  selected,
  onSelect,
  label,
  size = "md",
}: {
  variants: Variant[];
  selected: string; // slug
  onSelect: (v: Variant) => void;
  label: string;
  size?: "sm" | "md" | "lg";
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, variants.findIndex((v) => v.slug === selected));
  const dims = { sm: "h-5 w-5", md: "h-7 w-7", lg: "h-9 w-9" }[size];
  // Área táctil mínima de ~32–44 px aunque el círculo sea pequeño.
  const hit = { sm: "p-1.5", md: "p-1.5", lg: "p-1" }[size];

  const move = (to: number) => {
    const i = (to + variants.length) % variants.length;
    onSelect(variants[i]);
    refs.current[i]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") move(index + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") move(index - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(variants.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div role="radiogroup" aria-label={label} className="-m-1.5 flex flex-wrap" onKeyDown={onKeyDown}>
      {variants.map((v, i) => {
        const checked = i === index;
        return (
          <button
            key={v.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={v.name}
            title={v.name}
            tabIndex={checked ? 0 : -1}
            onClick={() => onSelect(v)}
            className={`group rounded-full ${hit} outline-none`}
          >
            <span
              className={`block rounded-full ${dims} transition-shadow ${
                isLight(v.hex) ? "border border-ink/35" : "border border-black/10"
              } ${checked ? "ring-[1.5px] ring-ink ring-offset-2 ring-offset-paper" : "group-hover:ring-1 group-hover:ring-ink/30 group-hover:ring-offset-2"} group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-ink`}
              style={{ backgroundColor: v.hex }}
            />
          </button>
        );
      })}
    </div>
  );
}
