"use client";

/* eslint-disable @next/next/no-img-element -- miniaturas del panel */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveCollection } from "../../../actions";
import { useAdminData } from "@/components/admin/AdminData";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { SizePicker } from "@/components/admin/SizePicker";
import { SortableGallery } from "@/components/admin/SortableGallery";
import { Card, Field, PriceInput, Spinner, StatusBadge, toast, useUnsavedWarning } from "@/components/admin/ui";
import { isLight } from "@/lib/catalog/helpers";
import type { Collection } from "@/lib/catalog/types";
import { formatCLP } from "@/lib/format";

type Piece = { variantId: string; role: "top" | "bottom" };

export function CollectionEditor({ collection, pieces: initialPieces }: { collection: Collection; pieces: Piece[] }) {
  const router = useRouter();
  const { products, byId } = useAdminData();
  const initial = {
    id: collection.id,
    name: collection.name,
    tagline: collection.tagline,
    description: collection.description,
    price: collection.price,
    status: collection.status,
    topSizes: collection.topSizes,
    bottomSizes: collection.bottomSizes,
    heroMediaId: collection.heroImage?.id ?? null,
    sortOrder: collection.sortOrder,
    pieces: initialPieces,
    mediaIds: collection.images.map((i) => i.id).filter(Boolean) as string[],
  };
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<null | "hero" | "gallery">(null);
  const [addProduct, setAddProduct] = useState("");
  const [addVariant, setAddVariant] = useState("");
  const [addRole, setAddRole] = useState<"top" | "bottom">("top");
  const dirty = JSON.stringify(d) !== JSON.stringify(initial);
  useUnsavedWarning(dirty);

  const variantInfo = (id: string) => {
    for (const p of products) {
      const v = p.variants.find((x) => x.id === id);
      if (v) return { p, v };
    }
    return null;
  };
  const separate = d.pieces.reduce((s, x) => {
    const i = variantInfo(x.variantId);
    return s + (i ? (i.v.price ?? i.p.price) : 0);
  }, 0);
  const tops = d.pieces.filter((p) => p.role === "top").length;
  const bottoms = d.pieces.filter((p) => p.role === "bottom").length;
  const hero = d.heroMediaId ? byId.get(d.heroMediaId) : undefined;

  const save = async (status = d.status) => {
    setSaving(true);
    const r = await saveCollection({ ...d, status });
    setSaving(false);
    if (!r.ok) return toast("error", r.error);
    toast("ok", status === "published" ? "Guardado y visible en la tienda." : "Guardado (borrador).");
    router.refresh();
  };

  const product = products.find((p) => p.id === addProduct);

  return (
    <div className="pb-10">
      <div className="mb-6 text-sm"><Link href="/admin/colecciones" className="text-muted hover:text-ink">← Guardarropas</Link></div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-light sm:text-3xl">{d.name}</h1>
          <StatusBadge status={collection.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn-secondary" href={collection.id === "frma-01" ? "/frma-01" : `/guardarropa/${collection.id}`} target="_blank" rel="noreferrer">Ver en la tienda ↗</a>
          {collection.status === "draft" ? (
            <button className="btn-secondary" disabled={saving} onClick={() => save("published")}>Guardar y publicar</button>
          ) : (
            <button className="btn-secondary" disabled={saving} onClick={() => save("draft")}>Despublicar</button>
          )}
          <button className="btn-primary" disabled={saving || !dirty} onClick={() => save()}>{saving ? <Spinner /> : dirty ? "Guardar cambios" : "Guardado"}</button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Información">
          <div className="grid gap-5">
            <Field label="Nombre" htmlFor="c-n"><input id="c-n" className="field" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
            <Field label="Frase corta" htmlFor="c-t"><input id="c-t" className="field" maxLength={160} value={d.tagline} onChange={(e) => setD({ ...d, tagline: e.target.value })} /></Field>
            <Field label="Descripción" htmlFor="c-d"><textarea id="c-d" className="field min-h-24 py-3" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} /></Field>
            <Field label="Precio del guardarropa (CLP)" htmlFor="c-p" hint={`Por separado: ${formatCLP(separate)}${d.price && separate > d.price ? ` · ahorro ${formatCLP(separate - d.price)} (${Math.round(((separate - d.price) / separate) * 100)}%)` : ""}`}>
              <PriceInput id="c-p" value={d.price || null} onChange={(v) => setD({ ...d, price: v ?? 0 })} />
            </Field>
          </div>
        </Card>

        <Card title="Foto principal" description="Se usa en la ficha del guardarropa, el catálogo y el inicio. Si no eliges una, se muestra una composición con las prendas.">
          <button type="button" onClick={() => setPicker("hero")} className="block aspect-[5/4] w-full overflow-hidden border border-dashed border-line bg-stone text-sm text-muted hover:border-ink">
            {hero ? <img src={hero.url} alt={hero.alt} className="h-full w-full object-cover" /> : "Elegir foto"}
          </button>
          {hero && <button className="mt-2 text-xs text-muted hover:text-ink" onClick={() => setD({ ...d, heroMediaId: null })}>Quitar foto principal</button>}
        </Card>

        <Card title={`Prendas (${d.pieces.length})`} description={`${tops} superiores × ${bottoms} pantalones = ${tops * bottoms} combinaciones.`}>
          <ul className="divide-y divide-line border-y border-line">
            {d.pieces.map((x, i) => {
              const info = variantInfo(x.variantId);
              const img = info?.v.images[0];
              return (
                <li key={x.variantId} className="flex items-center gap-3 py-2 text-sm">
                  <span className="h-12 w-10 shrink-0 overflow-hidden bg-stone">{img && <img src={img.src} alt="" className="h-full w-full object-cover" />}</span>
                  {info && <span className={`h-4 w-4 shrink-0 rounded-full ${isLight(info.v.hex) ? "border border-ink/30" : ""}`} style={{ backgroundColor: info.v.hex }} />}
                  <span className="min-w-0 flex-1 truncate">{info ? `${info.p.name} · ${info.v.name}` : "Prenda eliminada"}</span>
                  <select className="field min-h-9 w-auto py-1 text-xs" value={x.role} onChange={(e) => setD({ ...d, pieces: d.pieces.map((y, j) => (j === i ? { ...y, role: e.target.value as Piece["role"] } : y)) })} aria-label="Tipo de prenda">
                    <option value="top">Superior</option>
                    <option value="bottom">Pantalón</option>
                  </select>
                  <button className="px-2 text-muted hover:text-red-700" aria-label="Quitar prenda" onClick={() => setD({ ...d, pieces: d.pieces.filter((_, j) => j !== i) })}>×</button>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <select className="field min-h-10 py-1 text-sm" value={addProduct} onChange={(e) => (setAddProduct(e.target.value), setAddVariant(""))} aria-label="Producto">
              <option value="">Producto…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="field min-h-10 py-1 text-sm" value={addVariant} onChange={(e) => setAddVariant(e.target.value)} disabled={!product} aria-label="Color">
              <option value="">Color…</option>
              {product?.variants.filter((v) => !d.pieces.some((x) => x.variantId === v.id)).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <select className="field min-h-10 w-auto py-1 text-sm" value={addRole} onChange={(e) => setAddRole(e.target.value as Piece["role"])} aria-label="Tipo">
              <option value="top">Superior</option>
              <option value="bottom">Pantalón</option>
            </select>
            <button
              className="btn-secondary btn-sm shrink-0"
              disabled={!addVariant}
              onClick={() => {
                setD({ ...d, pieces: [...d.pieces, { variantId: addVariant, role: addRole }] });
                setAddVariant("");
              }}
            >
              Agregar
            </button>
          </div>
        </Card>

        <Card title="Tallas">
          <p className="mb-2 text-sm font-medium">Superiores</p>
          <SizePicker value={d.topSizes} onChange={(v) => setD({ ...d, topSizes: v })} label="Tallas superiores" />
          <p className="mb-2 mt-6 text-sm font-medium">Pantalones</p>
          <SizePicker value={d.bottomSizes} onChange={(v) => setD({ ...d, bottomSizes: v })} label="Tallas de pantalón" />
        </Card>

        <div className="xl:col-span-2">
          <Card title="Fotos de outfits y editorial" description="Se muestran en la ficha del guardarropa («Cómo se usa»). Arrastra para ordenar." actions={<button className="btn-primary btn-sm" onClick={() => setPicker("gallery")}>+ Agregar fotos</button>}>
            <SortableGallery ids={d.mediaIds} onChange={(ids) => setD({ ...d, mediaIds: ids })} showPrincipal={false} />
          </Card>
        </div>
      </div>

      <MediaPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        multiple={picker === "gallery"}
        defaultKind={picker === "hero" ? "editorial" : "outfit"}
        exclude={picker === "gallery" ? d.mediaIds : []}
        altFor={() => `${d.name}: guardarropa FRMA`}
        onSelect={(items) => (picker === "hero" ? setD({ ...d, heroMediaId: items[0]?.id ?? null }) : setD({ ...d, mediaIds: [...d.mediaIds, ...items.map((m) => m.id)] }))}
      />
    </div>
  );
}
