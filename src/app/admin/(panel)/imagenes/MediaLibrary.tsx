"use client";

/* eslint-disable @next/next/no-img-element -- miniaturas del panel */
import { useMemo, useState } from "react";
import { deleteMedia } from "../../actions";
import { PageHeader } from "@/components/admin/AdminShell";
import { useAdminData } from "@/components/admin/AdminData";
import { MediaEditModal } from "@/components/admin/MediaEditModal";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { confirmAction, toast } from "@/components/admin/ui";
import type { MediaItem } from "@/lib/admin/data";
import { MEDIA_KINDS, type MediaKind } from "@/lib/catalog/types";

export function MediaLibrary() {
  const { library, removeMediaLocal, products } = useAdminData();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"" | MediaKind>("");
  const [flag, setFlag] = useState<"" | "ia" | "sin-uso" | "sin-texto">("");
  const [product, setProduct] = useState("");
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(library.length === 0);

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return library.filter((m) => {
      if (kind && m.kind !== kind) return false;
      if (flag === "ia" && !m.isAi) return false;
      if (flag === "sin-uso" && m.usage.length) return false;
      if (flag === "sin-texto" && m.alt) return false;
      if (product && !m.tags.some((t) => t.productId === product) && !m.usage.some((u) => u.startsWith(products.find((p) => p.id === product)?.name ?? "\u0000"))) return false;
      if (ql && !`${m.alt} ${m.originalName ?? ""} ${m.usage.join(" ")}`.toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [library, q, kind, flag, product, products]);

  const removeSelected = async () => {
    const items = library.filter((m) => selected.includes(m.id));
    const used = items.filter((m) => m.usage.length);
    const ok = await confirmAction({
      title: `¿Eliminar ${items.length} ${items.length === 1 ? "foto" : "fotos"}?`,
      body: used.length ? `${used.length} de ellas se usan en productos, modelos o el inicio, y se quitarán de esos lugares. No se puede deshacer.` : "Se borrarán definitivamente. No se puede deshacer.",
      confirm: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    const r = await deleteMedia(selected);
    if (!r.ok) return toast("error", r.error);
    removeMediaLocal(selected);
    setSelected([]);
    toast("ok", "Fotos eliminadas.");
  };

  return (
    <>
      <PageHeader
        title="Biblioteca de imágenes"
        description="Todas las fotos de FRMA en un solo lugar. Súbelas aquí o directamente desde cada producto; puedes reutilizarlas en varios lugares."
        actions={<button className="btn-primary" onClick={() => setShowUpload((s) => !s)}>{showUpload ? "Ocultar subida" : "+ Subir fotos"}</button>}
      />

      {showUpload && (
        <div className="mb-8 border border-line bg-paper p-5">
          <MediaUploader />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        <input className="field min-h-10 py-1 text-sm lg:max-w-xs" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar fotos" />
        <select className="field min-h-10 w-auto py-1 text-sm" value={kind} onChange={(e) => setKind(e.target.value as MediaKind | "")} aria-label="Tipo">
          <option value="">Todos los tipos</option>
          {MEDIA_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
        <select className="field min-h-10 w-auto py-1 text-sm" value={product} onChange={(e) => setProduct(e.target.value)} aria-label="Producto">
          <option value="">Todos los productos</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="field min-h-10 w-auto py-1 text-sm" value={flag} onChange={(e) => setFlag(e.target.value as typeof flag)} aria-label="Filtro">
          <option value="">Todas</option>
          <option value="ia">Generadas con IA</option>
          <option value="sin-uso">Sin usar</option>
          <option value="sin-texto">Sin texto alternativo</option>
        </select>
        <span className="text-sm text-muted lg:ml-auto">{list.length} de {library.length}</span>
      </div>

      {selected.length > 0 && (
        <div className="mb-4 flex items-center justify-between border border-ink bg-paper px-4 py-2 text-sm">
          <span>{selected.length} seleccionada(s)</span>
          <div className="flex gap-2">
            <button className="btn-ghost btn-sm" onClick={() => setSelected([])}>Cancelar</button>
            <button className="btn-danger btn-sm" onClick={removeSelected}>Eliminar seleccionadas</button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <p className="border border-line bg-paper py-16 text-center text-sm text-muted">{library.length ? "Ninguna foto coincide con los filtros." : "La biblioteca está vacía. Sube tus primeras fotos."}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6" aria-label="Fotos de la biblioteca">
          {list.map((m) => {
            const sel = selected.includes(m.id);
            return (
              <li key={m.id} className={`group relative bg-paper ${sel ? "ring-2 ring-ink" : ""}`}>
                <button type="button" onClick={() => setEditing(m)} className="block w-full text-left" aria-label={`Editar foto ${m.alt || m.originalName || ""}`}>
                  <div className="relative overflow-hidden bg-stone">
                    <img src={m.url} alt={m.alt} className="aspect-[4/5] w-full object-cover" loading="lazy" />
                    {m.isAi && <span className="absolute left-1.5 top-1.5 bg-paper/90 px-1.5 text-[10px] uppercase tracking-wider">IA</span>}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs">{m.alt || <span className="text-amber-800">Sin texto alternativo</span>}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted">
                      {MEDIA_KINDS.find((k) => k.id === m.kind)?.label} · {m.usage.length ? `${m.usage.length} uso(s)` : "sin usar"}
                    </p>
                  </div>
                </button>
                <label className="absolute right-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center bg-paper/90" title="Seleccionar">
                  <input type="checkbox" className="h-4 w-4 accent-ink" checked={sel} onChange={() => setSelected((s) => (sel ? s.filter((x) => x !== m.id) : [...s, m.id]))} aria-label="Seleccionar foto" />
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <MediaEditModal media={editing} onClose={() => setEditing(null)} />
    </>
  );
}
