"use client";

/* eslint-disable @next/next/no-img-element -- miniaturas del panel */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CATEGORIES } from "@/config/catalog";
import { deleteProduct, saveProduct } from "../../../actions";
import { useAdminData } from "@/components/admin/AdminData";
import { EyedropperModal } from "@/components/admin/EyedropperModal";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { SizePicker } from "@/components/admin/SizePicker";
import { SortableGallery } from "@/components/admin/SortableGallery";
import { Card, confirmAction, Field, PriceInput, Spinner, StatusBadge, toast, Toggle, useUnsavedWarning } from "@/components/admin/ui";
import { isLight, isValidHex, slugify } from "@/lib/catalog/helpers";
import type { Product } from "@/lib/catalog/types";
import type { VariantPayload } from "@/lib/admin/validate";
import { formatCLP } from "@/lib/format";

type Draft = Omit<Product, "variants"> & { variants: (VariantPayload & { key: string })[] };

function toDraft(p: Product): Draft {
  return {
    ...p,
    variants: p.variants.map((v) => ({
      key: v.id,
      id: v.id,
      slug: v.slug,
      name: v.name,
      hex: v.hex.toUpperCase(),
      sku: v.sku,
      sizes: v.ownSizes ? v.sizes : null,
      price: v.price,
      active: v.active,
      mediaIds: v.images.map((i) => i.id).filter(Boolean) as string[],
    })),
  };
}

function suggestSku(productId: string, colorName: string) {
  return `${productId}-${slugify(colorName) || "color"}`.toUpperCase().slice(0, 80);
}

export function ProductEditor({ product }: { product: Product }) {
  const router = useRouter();
  const [initial] = useState(() => JSON.stringify(toDraft(product)));
  const [d, setD] = useState<Draft>(() => toDraft(product));
  const [saving, setSaving] = useState<false | "save" | "publish" | "unpublish" | "preview">(false);
  const [open, setOpen] = useState<string | null>(d.variants[0]?.key ?? null);
  const dirty = JSON.stringify(d) !== initial;
  useUnsavedWarning(dirty);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const setVariant = (key: string, patch: Partial<Draft["variants"][number]>) =>
    setD((x) => ({ ...x, variants: x.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) }));

  const addVariant = () => {
    const key = `new-${Date.now()}`;
    setD((x) => ({
      ...x,
      variants: [...x.variants, { key, id: null, slug: "", name: "", hex: "#CCCCCC", sku: "", sizes: null, price: null, active: true, mediaIds: [] }],
    }));
    setOpen(key);
  };

  const save = async (status: Draft["status"], mode: "save" | "publish" | "unpublish" | "preview") => {
    // SKU sugerido para colores nuevos sin SKU
    const payload = {
      ...d,
      status,
      variants: d.variants.map((v) => ({ ...v, sku: v.sku.trim() || suggestSku(d.id, v.name) })),
    };
    setSaving(mode);
    const r = await saveProduct(payload);
    setSaving(false);
    if (!r.ok) {
      toast("error", r.error);
      return false;
    }
    toast(
      "ok",
      mode === "publish" ? "¡Publicado! Ya se ve en la tienda." : mode === "unpublish" ? "Despublicado: ya no se ve en la tienda." : status === "published" ? "Cambios guardados y visibles en la tienda." : "Cambios guardados (borrador).",
    );
    router.refresh();
    return true;
  };

  const preview = async () => {
    if (dirty && !(await save(d.status, "preview"))) return;
    window.open(`/admin/vista-previa/${d.id}`, "_blank", "noopener");
  };

  return (
    <div className="pb-28">
      <div className="mb-6 text-sm">
        <Link href="/admin/productos" className="text-muted hover:text-ink">← Productos</Link>
      </div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-light tracking-tight sm:text-3xl">{d.name || "Sin nombre"}</h1>
            <StatusBadge status={product.status} />
          </div>
          <p className="mt-1 text-xs text-muted">
            Dirección en la tienda: /producto/{d.id} · Identificador para analítica: {d.id}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card title="Información">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nombre" htmlFor="p-name">
                <input id="p-name" className="field" maxLength={120} value={d.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Categoría" htmlFor="p-cat">
                <select id="p-cat" className="field" value={d.category} onChange={(e) => set("category", e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Precio (CLP)" htmlFor="p-price" hint="Precio de todos los colores, salvo que un color tenga precio específico.">
                <PriceInput id="p-price" value={d.price || null} onChange={(v) => set("price", v ?? 0)} placeholder="19.990" />
              </Field>
              <Field label="Orden en el catálogo" htmlFor="p-order" hint="Número menor aparece primero. También puedes ordenar desde la lista.">
                <input id="p-order" type="number" className="field" value={d.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Frase corta" htmlFor="p-tag" hint="Aparece sobre el nombre. Ej.: «La base de todo.»">
                  <input id="p-tag" className="field" maxLength={160} value={d.tagline} onChange={(e) => set("tagline", e.target.value)} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Descripción" htmlFor="p-desc">
                  <textarea id="p-desc" className="field min-h-28 py-3" maxLength={4000} value={d.description} onChange={(e) => set("description", e.target.value)} />
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Detalles" description="Si algo no está confirmado con el proveedor, escribe «pendiente de verificar».">
            <div className="grid gap-5">
              <Field label="Material y composición" htmlFor="p-mat">
                <textarea id="p-mat" className="field min-h-20 py-3" maxLength={600} value={d.material} onChange={(e) => set("material", e.target.value)} placeholder="Ej.: 100% algodón peinado, 180 g/m²" />
              </Field>
              <Field label="Características y calce" htmlFor="p-fit">
                <textarea id="p-fit" className="field min-h-20 py-3" maxLength={600} value={d.fit} onChange={(e) => set("fit", e.target.value)} placeholder="Ej.: Calce regular. El modelo mide 1,80 m y usa talla M." />
              </Field>
              <Field label="Cuidados (opcional)" htmlFor="p-care">
                <input id="p-care" className="field" maxLength={600} value={d.care} onChange={(e) => set("care", e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card title="Tallas del producto" description="Se usan en todos los colores, salvo que un color tenga tallas propias.">
            <SizePicker value={d.sizes} onChange={(v) => set("sizes", v)} />
          </Card>

          <Card
            title={`Colores (${d.variants.length})`}
            description="Cada color tiene su propio círculo en la tienda, sus fotos, tallas y precio opcional."
            actions={<button className="btn-primary btn-sm" onClick={addVariant}>+ Agregar color</button>}
          >
            {d.variants.length === 0 ? (
              <p className="border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
                Aún no hay colores. <button className="link-underline" onClick={addVariant}>Agrega el primero</button>.
              </p>
            ) : (
              <div className="space-y-3">
                {d.variants.map((v, i) => (
                  <VariantCard
                    key={v.key}
                    v={v}
                    index={i}
                    total={d.variants.length}
                    product={d}
                    open={open === v.key}
                    onToggle={() => setOpen(open === v.key ? null : v.key)}
                    onChange={(patch) => setVariant(v.key, patch)}
                    onMove={(to) =>
                      setD((x) => {
                        const list = [...x.variants];
                        const [it] = list.splice(i, 1);
                        list.splice(to, 0, it);
                        return { ...x, variants: list };
                      })
                    }
                    onRemove={async () => {
                      const ok = await confirmAction({
                        title: `¿Quitar el color «${v.name || "sin nombre"}»?`,
                        body: "Se eliminará al guardar. Sus fotos seguirán en la biblioteca. Si solo quieres ocultarlo, desactívalo.",
                        confirm: "Quitar color",
                        danger: true,
                      });
                      if (ok) setD((x) => ({ ...x, variants: x.variants.filter((y) => y.key !== v.key) }));
                    }}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Columna lateral */}
        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card title="Publicación">
            <p className="text-sm text-muted">
              {product.status === "published" ? "Este producto se ve en la tienda." : "Borrador: no se ve en la tienda hasta que lo publiques."}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {product.status === "draft" ? (
                <button className="btn-primary" disabled={Boolean(saving)} onClick={() => save("published", "publish").then((ok) => ok && set("status", "published"))}>
                  {saving === "publish" ? <Spinner /> : "Guardar y publicar"}
                </button>
              ) : (
                <button className="btn-secondary" disabled={Boolean(saving)} onClick={() => save("draft", "unpublish").then((ok) => ok && set("status", "draft"))}>
                  {saving === "unpublish" ? <Spinner /> : "Despublicar"}
                </button>
              )}
              <button className="btn-secondary" disabled={Boolean(saving)} onClick={preview}>
                {saving === "preview" ? <Spinner /> : "Vista previa"}
              </button>
              <button
                className="btn-ghost text-red-700"
                onClick={async () => {
                  const ok = await confirmAction({ title: `¿Eliminar «${d.name}»?`, body: "Se eliminará el producto con todos sus colores. Las fotos quedan en la biblioteca.", confirm: "Eliminar producto", danger: true });
                  if (!ok) return;
                  const r = await deleteProduct(d.id);
                  if (!r.ok) return toast("error", r.error);
                  toast("ok", "Producto eliminado.");
                  router.push("/admin/productos");
                }}
              >
                Eliminar producto
              </button>
            </div>
          </Card>
          <PreviewMini d={d} />
        </aside>
      </div>

      {/* Barra fija de guardado */}
      <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur transition-transform ${dirty ? "translate-y-0" : "translate-y-full"}`} aria-hidden={!dirty}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-10 lg:pl-72">
          <span className="text-sm">Tienes cambios sin guardar</span>
          <div className="flex gap-2">
            <button className="btn-ghost btn-sm" onClick={() => confirmAction({ title: "¿Descartar los cambios?", confirm: "Descartar", danger: true }).then((ok) => ok && setD(JSON.parse(initial)))} tabIndex={dirty ? 0 : -1}>
              Descartar
            </button>
            <button className="btn-primary" disabled={Boolean(saving)} onClick={() => save(d.status, "save")} tabIndex={dirty ? 0 : -1}>
              {saving === "save" ? <><Spinner className="mr-2" /> Guardando…</> : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VariantCard({
  v,
  index,
  total,
  product,
  open,
  onToggle,
  onChange,
  onMove,
  onRemove,
}: {
  v: Draft["variants"][number];
  index: number;
  total: number;
  product: Draft;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<Draft["variants"][number]>) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const { byId } = useAdminData();
  const [picker, setPicker] = useState(false);
  const [dropper, setDropper] = useState(false);
  const [hexText, setHexText] = useState(v.hex);
  const photos = useMemo(() => v.mediaIds.map((id) => byId.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof byId.get>>[], [v.mediaIds, byId]);
  const cover = photos[0];
  const ownSizes = v.sizes !== null;
  const uid = v.key;

  const setHex = (h: string) => {
    const up = h.toUpperCase();
    setHexText(up);
    if (isValidHex(up)) onChange({ hex: up });
  };

  return (
    <div className={`border ${open ? "border-ink" : "border-line"} bg-paper`}>
      <div className="flex items-center gap-3 p-3">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open}>
          <span className={`h-9 w-9 shrink-0 rounded-full ${isLight(v.hex) ? "border border-ink/35" : ""}`} style={{ backgroundColor: v.hex }} aria-hidden />
          <span className="h-12 w-10 shrink-0 overflow-hidden bg-stone">{cover && <img src={cover.url} alt="" className="h-full w-full object-cover" />}</span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{v.name || "Nuevo color"}</span>
            <span className="block truncate text-xs text-muted">
              {v.hex} · {photos.length} {photos.length === 1 ? "foto" : "fotos"} · {v.active ? "activo" : "inactivo"}
              {v.price !== null ? ` · ${formatCLP(v.price)}` : ""}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 items-center">
          <button type="button" className="px-2 py-1 text-muted hover:text-ink disabled:opacity-25" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`Subir color ${v.name}`}>▲</button>
          <button type="button" className="px-2 py-1 text-muted hover:text-ink disabled:opacity-25" disabled={index === total - 1} onClick={() => onMove(index + 1)} aria-label={`Bajar color ${v.name}`}>▼</button>
          <button type="button" className="px-2 py-1 text-muted hover:text-ink" onClick={onToggle} aria-label={open ? "Cerrar" : "Editar"}>{open ? "−" : "✎"}</button>
        </div>
      </div>

      {open && (
        <div className="space-y-6 border-t border-line p-4 sm:p-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nombre comercial del color" htmlFor={`${uid}-name`}>
              <input id={`${uid}-name`} className="field" maxLength={60} value={v.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Ej.: Azul marino" />
            </Field>
            <Field label="SKU (identificador único)" htmlFor={`${uid}-sku`} hint={v.sku ? undefined : `Si lo dejas vacío se usará ${suggestSku(product.id, v.name || "color")}`}>
              <div className="flex gap-2">
                <input id={`${uid}-sku`} className="field uppercase" maxLength={80} value={v.sku} onChange={(e) => onChange({ sku: e.target.value.toUpperCase() })} />
                <button type="button" className="btn-secondary btn-sm shrink-0" onClick={() => onChange({ sku: suggestSku(product.id, v.name) })}>Generar</button>
              </div>
            </Field>
          </div>

          <div>
            <p className="text-sm font-medium">Tono del círculo en la tienda</p>
            <p className="mt-1 text-xs text-muted">Elige con el selector, escribe el código HEX o usa el cuentagotas sobre una foto de este color.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className={`h-12 w-12 rounded-full ${isLight(v.hex) ? "border border-ink/35" : ""}`} style={{ backgroundColor: v.hex }} aria-hidden />
              <label className="relative">
                <span className="sr-only">Selector de color</span>
                <input type="color" value={v.hex.toLowerCase()} onChange={(e) => setHex(e.target.value)} className="h-12 w-16 cursor-pointer border border-line bg-paper p-1" />
              </label>
              <input
                className={`field w-32 font-mono uppercase ${isValidHex(hexText) ? "" : "border-red-600"}`}
                value={hexText}
                maxLength={7}
                onChange={(e) => setHex(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)}
                aria-label="Código HEX"
                aria-invalid={!isValidHex(hexText)}
              />
              <button type="button" className="btn-secondary btn-sm" onClick={() => setDropper(true)}>
                Cuentagotas
              </button>
            </div>
            {!isValidHex(hexText) && <p className="mt-1 text-xs text-red-700">Formato: # seguido de 6 caracteres (0-9, A-F). Ej.: #1F2A3C</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Precio específico (opcional)" hint={`Déjalo vacío para usar el precio del producto${product.price ? ` (${formatCLP(product.price)})` : ""}.`}>
              <PriceInput value={v.price} onChange={(p) => onChange({ price: p })} placeholder="Usa el del producto" />
            </Field>
            <div className="pt-6">
              <Toggle checked={v.active} onChange={(a) => onChange({ active: a })} label="Color activo" description="Si lo desactivas, no aparece en la tienda." />
            </div>
          </div>

          <div>
            <Toggle
              checked={!ownSizes}
              onChange={(inherit) => onChange({ sizes: inherit ? null : [...product.sizes] })}
              label="Usar las tallas del producto"
              description={`Tallas del producto: ${product.sizes.join(", ") || "ninguna"}`}
            />
            {ownSizes && (
              <div className="mt-4 border-l-2 border-line pl-4">
                <SizePicker value={v.sizes ?? []} onChange={(s) => onChange({ sizes: s })} label={`Tallas de ${v.name}`} />
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Fotos de {v.name || "este color"}</p>
                <p className="text-xs text-muted">Arrastra para ordenar. La primera es la principal (★ para cambiarla). Solo se muestran con este color.</p>
              </div>
              <button type="button" className="btn-primary btn-sm" onClick={() => setPicker(true)}>+ Agregar fotos</button>
            </div>
            <SortableGallery ids={v.mediaIds} onChange={(ids) => onChange({ mediaIds: ids })} emptyText="Sin fotos: la tienda mostrará una ilustración. Sube la foto frontal, posterior y con modelo." />
          </div>

          <div className="flex justify-end border-t border-line pt-4">
            <button type="button" className="btn-ghost btn-sm text-red-700" onClick={onRemove}>Quitar este color</button>
          </div>
        </div>
      )}

      <MediaPicker
        open={picker}
        onClose={() => setPicker(false)}
        exclude={v.mediaIds}
        title={`Fotos de ${product.name} · ${v.name || "nuevo color"}`}
        altFor={(_f, i) => `${product.name} ${v.name}`.trim() + (i ? ` — foto ${i + 1}` : "")}
        suggest={v.id ? { productId: product.id, variantId: v.id, label: `${product.name} ${v.name}` } : { productId: product.id, label: product.name }}
        onSelect={(items) => onChange({ mediaIds: [...v.mediaIds, ...items.map((m) => m.id)] })}
      />
      <EyedropperModal open={dropper} onClose={() => setDropper(false)} photos={photos} initial={v.hex} onPick={(h) => setHex(h)} />
    </div>
  );
}

/** Vista rápida de cómo se verá la tarjeta en el catálogo. */
function PreviewMini({ d }: { d: Draft }) {
  const { byId } = useAdminData();
  const active = d.variants.filter((v) => v.active);
  const [sel, setSel] = useState(0);
  const v = active[Math.min(sel, active.length - 1)];
  const img = v ? byId.get(v.mediaIds[0]) : undefined;
  return (
    <Card title="Así se verá en el catálogo">
      <div className="aspect-[4/5] overflow-hidden bg-stone">{img && <img src={img.url} alt="" className="h-full w-full object-cover" />}</div>
      <div className="mt-3 flex justify-between text-sm">
        <div>
          <p className="font-medium">{d.name}</p>
          <p className="text-xs text-muted">{v?.name ?? "Sin colores activos"}</p>
        </div>
        <p>{formatCLP(v?.price ?? d.price)}</p>
      </div>
      <div className="mt-2 flex gap-1.5">
        {active.map((x, i) => (
          <button key={x.key} type="button" onClick={() => setSel(i)} aria-label={x.name} className={`h-5 w-5 rounded-full ${isLight(x.hex) ? "border border-ink/35" : ""} ${i === sel ? "ring-1 ring-ink ring-offset-2" : ""}`} style={{ backgroundColor: x.hex }} />
        ))}
      </div>
    </Card>
  );
}
