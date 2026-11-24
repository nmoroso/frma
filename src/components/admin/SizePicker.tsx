"use client";

import { useState } from "react";
import { SIZE_PRESETS } from "@/config/catalog";

/** Selección de tallas: grupos sugeridos + tallas personalizadas. */
export function SizePicker({ value, onChange, label = "Tallas" }: { value: string[]; onChange: (v: string[]) => void; label?: string }) {
  const [custom, setCustom] = useState("");
  const toggle = (s: string) => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
  const known = new Set(SIZE_PRESETS.flatMap((p) => p.sizes));
  const extra = value.filter((s) => !known.has(s));

  return (
    <div className="space-y-3" role="group" aria-label={label}>
      {SIZE_PRESETS.map((preset) => (
        <div key={preset.label} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="w-40 shrink-0 text-xs text-muted">{preset.label}</span>
          <div className="flex flex-wrap gap-1.5">
            {preset.sizes.map((s) => (
              <button key={s} type="button" aria-pressed={value.includes(s)} onClick={() => toggle(s)} className={`chip min-h-9 min-w-11 justify-center px-2 ${value.includes(s) ? "chip-active" : ""}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <span className="w-40 shrink-0 text-xs text-muted">Otra talla</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {extra.map((s) => (
            <button key={s} type="button" onClick={() => toggle(s)} className="chip chip-active min-h-9 px-2" aria-label={`Quitar talla ${s}`}>
              {s} ×
            </button>
          ))}
          <input
            className="field min-h-9 w-24 py-1 text-sm"
            placeholder="Ej.: 52"
            maxLength={12}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const s = custom.trim();
                if (s && !value.includes(s)) onChange([...value, s]);
                setCustom("");
              }
            }}
            aria-label="Agregar otra talla (Enter)"
          />
        </div>
      </div>
      {value.length > 0 && <p className="text-xs text-muted">Orden en la tienda: {value.join(" · ")}</p>}
    </div>
  );
}
