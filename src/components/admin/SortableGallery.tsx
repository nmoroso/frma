"use client";

/* eslint-disable @next/next/no-img-element -- miniaturas del panel */
import { useState } from "react";
import type { MediaItem } from "@/lib/admin/data";
import { useAdminData } from "./AdminData";
import { MediaEditModal } from "./MediaEditModal";

/**
 * Galería ordenable: arrastra para reordenar (computador) o usa los botones
 * ← → (celular y teclado). La primera foto es la PRINCIPAL.
 */
export function SortableGallery({
  ids,
  onChange,
  emptyText = "Aún no hay fotos.",
  showPrincipal = true,
}: {
  ids: string[];
  onChange: (ids: string[]) => void;
  emptyText?: string;
  showPrincipal?: boolean;
}) {
  const { byId } = useAdminData();
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const items = ids.map((id) => byId.get(id)).filter(Boolean) as MediaItem[];

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items.map((m) => m.id)];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };

  if (!items.length) return <p className="border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{emptyText}</p>;

  return (
    <>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6" aria-label="Fotos (la primera es la principal)">
        {items.map((m, i) => (
          <li
            key={m.id}
            draggable
            onDragStart={(e) => {
              setDrag(i);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(i);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              if (drag !== null) move(drag, i);
              setDrag(null);
              setOver(null);
            }}
            onDragEnd={() => {
              setDrag(null);
              setOver(null);
            }}
            className={`group relative cursor-grab bg-paper active:cursor-grabbing ${drag === i ? "opacity-40" : ""} ${over === i && drag !== i ? "outline-2 outline-offset-2 outline-ink outline-dashed" : ""}`}
          >
            <div className="relative overflow-hidden bg-stone">
              <img src={m.url} alt={m.alt} className="aspect-[4/5] w-full object-cover" loading="lazy" draggable={false} />
              {showPrincipal && i === 0 && <span className="absolute left-1 top-1 bg-ink px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-paper">Principal</span>}
              {m.isAi && <span className="absolute bottom-1 left-1 bg-paper/90 px-1 text-[9px] uppercase tracking-wider">IA</span>}
              {!m.alt && <span className="absolute bottom-1 right-1 bg-amber-100 px-1 text-[9px] text-amber-900" title="Falta texto alternativo">sin texto</span>}
            </div>
            <div className="mt-1 flex items-center justify-between gap-1 text-xs">
              <div className="flex">
                <button type="button" className="px-1.5 py-1 text-muted hover:text-ink disabled:opacity-30" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Mover foto ${i + 1} a la izquierda`}>
                  ←
                </button>
                <button type="button" className="px-1.5 py-1 text-muted hover:text-ink disabled:opacity-30" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} aria-label={`Mover foto ${i + 1} a la derecha`}>
                  →
                </button>
              </div>
              <div className="flex">
                {showPrincipal && i > 0 && (
                  <button type="button" className="px-1.5 py-1 text-muted hover:text-ink" onClick={() => move(i, 0)} title="Usar como foto principal" aria-label={`Usar foto ${i + 1} como principal`}>
                    ★
                  </button>
                )}
                <button type="button" className="px-1.5 py-1 text-muted hover:text-ink" onClick={() => setEditing(m)} aria-label={`Editar foto ${i + 1}`} title="Editar texto, tipo o reemplazar">
                  ✎
                </button>
                <button type="button" className="px-1.5 py-1 text-muted hover:text-red-700" onClick={() => onChange(items.filter((x) => x.id !== m.id).map((x) => x.id))} aria-label={`Quitar foto ${i + 1} de esta galería`} title="Quitar de esta galería (sigue en la biblioteca)">
                  ×
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <MediaEditModal media={editing} onClose={() => setEditing(null)} onDeleted={(id) => onChange(ids.filter((x) => x !== id))} />
    </>
  );
}
