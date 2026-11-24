"use client";

/* eslint-disable @next/next/no-img-element -- miniaturas del panel */
import { useMemo, useState } from "react";
import type { MediaItem } from "@/lib/admin/data";
import { MEDIA_KINDS, type MediaKind } from "@/lib/catalog/types";
import { useAdminData } from "./AdminData";
import { MediaUploader } from "./MediaUploader";
import { Modal } from "./ui";

/**
 * Elegir fotos: subir nuevas o reutilizar fotos de la biblioteca.
 * `suggest` permite filtrar las fotos etiquetadas con un producto/color.
 */
export function MediaPicker({
  open,
  onClose,
  onSelect,
  multiple = true,
  exclude = [],
  defaultKind = "producto",
  suggest,
  altFor,
  title = "Agregar fotos",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (items: MediaItem[]) => void;
  multiple?: boolean;
  exclude?: string[];
  defaultKind?: MediaKind;
  suggest?: { productId: string; variantId?: string; label: string };
  altFor?: (file: File, i: number) => string;
  title?: string;
}) {
  const { library } = useAdminData();
  const [tab, setTab] = useState<"subir" | "biblioteca">("subir");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"" | MediaKind>("");
  const [onlySuggested, setOnlySuggested] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return library.filter((m) => {
      if (exclude.includes(m.id)) return false;
      if (kind && m.kind !== kind) return false;
      if (onlySuggested && suggest && !m.tags.some((t) => t.productId === suggest.productId && (!suggest.variantId || !t.variantId || t.variantId === suggest.variantId))) return false;
      if (ql && !`${m.alt} ${m.originalName ?? ""}`.toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [library, exclude, kind, q, onlySuggested, suggest]);

  const close = () => {
    setSelected([]);
    onClose();
  };
  const confirm = () => {
    const items = selected.map((id) => library.find((m) => m.id === id)).filter(Boolean) as MediaItem[];
    onSelect(items);
    close();
  };
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : multiple ? [...s, id] : [id]));

  return (
    <Modal open={open} onClose={close} title={title} size="xl">
      <div className="mb-5 flex gap-1 border-b border-line" role="tablist">
        {(["subir", "biblioteca"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === t ? "border-ink font-medium" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t === "subir" ? "Subir desde el computador" : `Elegir de la biblioteca (${library.length})`}
          </button>
        ))}
      </div>

      {tab === "subir" ? (
        <MediaUploader
          defaultKind={defaultKind}
          altFor={altFor}
          multiple={multiple}
          onUploaded={(items) => {
            onSelect(multiple ? items : items.slice(0, 1));
            close();
          }}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input className="field min-h-10 py-1 text-sm sm:max-w-xs" placeholder="Buscar por descripción o archivo…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar fotos" />
            <select className="field min-h-10 w-auto py-1 text-sm" value={kind} onChange={(e) => setKind(e.target.value as MediaKind | "")} aria-label="Tipo de foto">
              <option value="">Todos los tipos</option>
              {MEDIA_KINDS.map((k) => (
                <option key={k.id} value={k.id}>{k.label}</option>
              ))}
            </select>
            {suggest && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-ink" checked={onlySuggested} onChange={(e) => setOnlySuggested(e.target.checked)} />
                Solo etiquetadas con {suggest.label}
              </label>
            )}
          </div>
          {list.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">No hay fotos que coincidan. Sube nuevas en la otra pestaña.</p>
          ) : (
            <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
              {list.map((m) => {
                const i = selected.indexOf(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => toggle(m.id)}
                      aria-pressed={i >= 0}
                      className={`relative block w-full overflow-hidden bg-stone ${i >= 0 ? "ring-2 ring-ink ring-offset-2" : "hover:opacity-90"}`}
                    >
                      <img src={m.url} alt={m.alt} className="aspect-square w-full object-cover" loading="lazy" />
                      {i >= 0 && <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-paper">{multiple ? i + 1 : "✓"}</span>}
                      {m.isAi && <span className="absolute bottom-1 left-1 bg-paper/90 px-1 text-[9px] uppercase tracking-wider">IA</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="sticky bottom-0 mt-5 flex items-center justify-between gap-3 border-t border-line bg-paper pt-4">
            <span className="text-sm text-muted">{selected.length ? `${selected.length} seleccionada(s)` : "Haz clic en las fotos para seleccionarlas"}</span>
            <button className="btn-primary" disabled={!selected.length} onClick={confirm}>
              Agregar selección
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
