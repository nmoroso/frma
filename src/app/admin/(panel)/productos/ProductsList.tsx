"use client";

/* eslint-disable @next/next/no-img-element -- miniaturas del panel */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIES } from "@/config/catalog";
import { createProduct, deleteProduct, duplicateProduct, reorderProducts, setProductStatus } from "../../actions";
import { PageHeader } from "@/components/admin/AdminShell";
import { confirmAction, Field, Modal, Spinner, StatusBadge, toast } from "@/components/admin/ui";
import { categoryName, isLight } from "@/lib/catalog/helpers";
import type { Product } from "@/lib/catalog/types";
import { formatCLP } from "@/lib/format";

export function ProductsList({ products: initial }: { products: Product[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);
  const [filter, setFilter] = useState<"todos" | "published" | "draft">("todos");

  const act = async (id: string, label: string, fn: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    setBusy(`${id}:${label}`);
    const r = await fn();
    setBusy(null);
    if (!r.ok) {
      toast("error", r.error ?? "No se pudo completar la acción.");
      return false;
    }
    toast("ok", success);
    return true;
  };

  const move = (i: number, to: number) => {
    if (to < 0 || to >= products.length) return;
    const next = [...products];
    const [x] = next.splice(i, 1);
    next.splice(to, 0, x);
    setProducts(next);
    setOrderDirty(true);
  };

  const visible = products.filter((p) => filter === "todos" || p.status === filter);

  return (
    <>
      <PageHeader
        title="Productos"
        description="Cada producto puede tener varios colores, cada uno con sus propias fotos, tallas y precio opcional."
        actions={
          <>
            {orderDirty && (
              <button
                className="btn-secondary"
                onClick={async () => {
                  if (await act("orden", "orden", () => reorderProducts(products.map((p) => p.id)), "Orden del catálogo guardado.")) setOrderDirty(false);
                }}
              >
                Guardar orden
              </button>
            )}
            <button className="btn-primary" onClick={() => setCreating(true)}>+ Nuevo producto</button>
          </>
        }
      />

      <div className="mb-4 flex gap-2 text-sm" role="tablist" aria-label="Filtrar por estado">
        {([["todos", "Todos"], ["published", "Publicados"], ["draft", "Borradores"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={filter === k} className={`chip min-h-9 ${filter === k ? "chip-active" : ""}`} onClick={() => setFilter(k)}>
            {l} ({k === "todos" ? products.length : products.filter((p) => p.status === k).length})
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="border border-line bg-paper p-10 text-center text-sm text-muted">
          Aún no hay productos. Crea uno o importa el catálogo inicial desde el <Link href="/admin" className="link-underline">Resumen</Link>.
        </div>
      ) : (
        <ul className="divide-y divide-line border border-line bg-paper">
          {visible.map((p) => {
            const i = products.indexOf(p);
            const cover = p.variants.find((v) => v.images.length)?.images[0];
            return (
              <li key={p.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4 sm:flex-1">
                  <div className="flex flex-col" aria-label="Orden en el catálogo">
                    <button className="px-2 text-muted hover:text-ink disabled:opacity-25" disabled={i === 0 || filter !== "todos"} onClick={() => move(i, i - 1)} aria-label={`Subir ${p.name}`}>▲</button>
                    <button className="px-2 text-muted hover:text-ink disabled:opacity-25" disabled={i === products.length - 1 || filter !== "todos"} onClick={() => move(i, i + 1)} aria-label={`Bajar ${p.name}`}>▼</button>
                  </div>
                  <Link href={`/admin/productos/${p.id}`} className="h-20 w-16 shrink-0 overflow-hidden bg-stone">
                    {cover ? <img src={cover.src} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[10px] text-muted">sin foto</span>}
                  </Link>
                  <div className="min-w-0">
                    <Link href={`/admin/productos/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {categoryName(p.category)} · {p.price ? formatCLP(p.price) : "sin precio"} · {p.variants.length} {p.variants.length === 1 ? "color" : "colores"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {p.variants.map((v) => (
                        <span key={v.id} title={`${v.name}${v.active ? "" : " (inactivo)"}`} className={`h-4 w-4 rounded-full ${isLight(v.hex) ? "border border-ink/30" : ""} ${v.active ? "" : "opacity-30"}`} style={{ backgroundColor: v.hex }} />
                      ))}
                      <span className="ml-2"><StatusBadge status={p.status} /></span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/productos/${p.id}`} className="btn-primary btn-sm">Editar</Link>
                  <button
                    className="btn-secondary btn-sm"
                    disabled={busy !== null}
                    onClick={async () => {
                      const next = p.status === "published" ? "draft" : "published";
                      if (await act(p.id, "status", () => setProductStatus(p.id, next), next === "published" ? `${p.name} publicado.` : `${p.name} ahora es borrador (no se ve en la tienda).`))
                        setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, status: next } : x)));
                    }}
                  >
                    {busy === `${p.id}:status` ? <Spinner /> : p.status === "published" ? "Despublicar" : "Publicar"}
                  </button>
                  <button
                    className="btn-secondary btn-sm"
                    disabled={busy !== null}
                    onClick={async () => {
                      setBusy(`${p.id}:dup`);
                      const r = await duplicateProduct(p.id);
                      setBusy(null);
                      if (!r.ok) return toast("error", r.error);
                      toast("ok", "Producto duplicado como borrador.");
                      router.push(`/admin/productos/${r.data.id}`);
                    }}
                  >
                    {busy === `${p.id}:dup` ? <Spinner /> : "Duplicar"}
                  </button>
                  <button
                    className="btn-ghost btn-sm text-red-700"
                    disabled={busy !== null}
                    onClick={async () => {
                      const ok = await confirmAction({
                        title: `¿Eliminar «${p.name}»?`,
                        body: "Se eliminarán el producto y todos sus colores. Las fotos seguirán en la biblioteca. Esta acción no se puede deshacer.\n\nSi solo quieres ocultarlo, usa «Despublicar».",
                        confirm: "Eliminar producto",
                        danger: true,
                      });
                      if (!ok) return;
                      if (await act(p.id, "del", () => deleteProduct(p.id), "Producto eliminado.")) setProducts((list) => list.filter((x) => x.id !== p.id));
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <CreateProductModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false);
          router.push(`/admin/productos/${id}`);
        }}
      />
    </>
  );
}

function CreateProductModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("poleras");
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Nuevo producto" size="sm">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const r = await createProduct(name, category);
          setBusy(false);
          if (!r.ok) return toast("error", r.error);
          toast("ok", "Producto creado como borrador. Ahora agrega colores y fotos.");
          onCreated(r.data.id);
        }}
      >
        <Field label="Nombre" htmlFor="np-name" hint="Puedes cambiarlo después.">
          <input id="np-name" className="field" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Sweater Merino" autoFocus />
        </Field>
        <Field label="Categoría" htmlFor="np-cat">
          <select id="np-cat" className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <button className="btn-primary w-full" disabled={busy || !name.trim()}>{busy ? "Creando…" : "Crear y continuar"}</button>
      </form>
    </Modal>
  );
}
