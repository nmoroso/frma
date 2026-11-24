"use client";

/* eslint-disable @next/next/no-img-element -- miniaturas del panel: se muestran tal cual */
import { useRef, useState } from "react";
import { deleteMedia, setMediaProducts, updateMedia } from "@/app/admin/actions";
import type { MediaItem } from "@/lib/admin/data";
import { MEDIA_KINDS, type MediaKind } from "@/lib/catalog/types";
import { ACCEPT, replaceFile } from "@/lib/admin/upload-client";
import { useAdminData } from "./AdminData";
import { confirmAction, Field, Modal, Spinner, toast, Toggle } from "./ui";

/** Ficha de una foto: datos, prendas que aparecen, reemplazar y eliminar. */
export function MediaEditModal({ media, onClose, onDeleted }: { media: MediaItem | null; onClose: () => void; onDeleted?: (id: string) => void }) {
  return (
    <Modal open={Boolean(media)} onClose={onClose} title="Detalle de la foto" size="lg">
      {media && <MediaEditor key={media.id} media={media} onClose={onClose} onDeleted={onDeleted} />}
    </Modal>
  );
}

function MediaEditor({ media, onClose, onDeleted }: { media: MediaItem; onClose: () => void; onDeleted?: (id: string) => void }) {
  const { updateMediaLocal, removeMediaLocal } = useAdminData();
  const [alt, setAlt] = useState(media.alt);
  const [kind, setKind] = useState<MediaKind>(media.kind);
  const [isAi, setIsAi] = useState(media.isAi);
  const [tags, setTags] = useState(media.tags);
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState<number | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const save = async () => {
    setSaving(true);
    const a = await updateMedia(media.id, { alt, kind, isAi });
    const b = a.ok ? await setMediaProducts(media.id, tags) : a;
    setSaving(false);
    if (!a.ok || !b.ok) return toast("error", (!a.ok ? a.error : !b.ok ? b.error : "") || "No se pudo guardar.");
    updateMediaLocal(media.id, { alt, kind, isAi, tags });
    toast("ok", "Foto actualizada.");
    onClose();
  };

  const remove = async () => {
    const used = media.usage.length ? `\n\nSe quitará también de:\n• ${media.usage.join("\n• ")}` : "";
    if (!(await confirmAction({ title: "¿Eliminar esta foto?", body: `Se borrará definitivamente de la biblioteca.${used}`, confirm: "Eliminar foto", danger: true }))) return;
    const r = await deleteMedia([media.id]);
    if (!r.ok) return toast("error", r.error);
    removeMediaLocal([media.id]);
    onDeleted?.(media.id);
    toast("ok", "Foto eliminada.");
    onClose();
  };

  const replace = async (f: File) => {
    setReplacing(0);
    try {
      const updated = await replaceFile(media.id, f, (p) => setReplacing(p));
      updateMediaLocal(media.id, { url: updated.url, width: updated.width, height: updated.height, bytes: updated.bytes, originalName: updated.originalName });
      toast("ok", "Foto reemplazada. Se actualizó en todos los lugares donde se usa.");
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setReplacing(null);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div>
        <div className="relative bg-stone">
          <img src={media.url} alt={alt} className="mx-auto max-h-[60vh] w-auto object-contain" />
          {replacing !== null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-paper/80 text-sm">
              <Spinner /> Reemplazando… {Math.round(replacing * 100)}%
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          {media.originalName && <>{media.originalName} · </>}
          {media.width && media.height ? `${media.width}×${media.height}px` : ""}
          {media.bytes ? ` · ${(media.bytes / 1024).toFixed(0)} KB` : ""}
        </p>
        {media.usage.length > 0 ? (
          <div className="mt-4 text-sm">
            <p className="font-medium">Se usa en</p>
            <ul className="mt-1 list-disc pl-5 text-muted">
              {media.usage.map((u) => <li key={u}>{u}</li>)}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">Esta foto aún no se usa en ningún lugar.</p>
        )}
      </div>

      <div className="space-y-5">
        <Field label="Texto alternativo" hint="Describe la foto para personas con lector de pantalla y para Google. Ej.: «Polera Essential azul marino, vista frontal».">
          <textarea className="field min-h-20 py-3" maxLength={300} value={alt} onChange={(e) => setAlt(e.target.value)} />
        </Field>
        <Field label="Tipo de foto">
          <select className="field" value={kind} onChange={(e) => setKind(e.target.value as MediaKind)}>
            {MEDIA_KINDS.map((k) => (
              <option key={k.id} value={k.id}>{k.label}</option>
            ))}
          </select>
        </Field>
        <Toggle checked={isAi} onChange={setIsAi} label="Imagen conceptual generada con IA" description="En la tienda se mostrará la etiqueta «Imagen conceptual»." />
        <TagEditor tags={tags} onChange={setTags} />

        <div className="flex flex-wrap gap-2 border-t border-line pt-5">
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <><Spinner className="mr-2" /> Guardando…</> : "Guardar"}
          </button>
          <button className="btn-secondary" onClick={() => file.current?.click()} disabled={replacing !== null}>
            Reemplazar archivo
          </button>
          <button className="btn-ghost text-red-700" onClick={remove}>Eliminar</button>
          <input ref={file} type="file" accept={ACCEPT} className="hidden" onChange={(e) => e.target.files?.[0] && replace(e.target.files[0])} />
        </div>
      </div>
    </div>
  );
}

/** Prendas (producto + color) que aparecen en la foto. Útil para fotos con modelo y outfits. */
export function TagEditor({ tags, onChange }: { tags: MediaItem["tags"]; onChange: (t: MediaItem["tags"]) => void }) {
  const { products } = useAdminData();
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const product = products.find((p) => p.id === productId);

  const label = (t: MediaItem["tags"][number]) => {
    const p = products.find((x) => x.id === t.productId);
    const v = p?.variants.find((x) => x.id === t.variantId);
    return { name: p?.name ?? t.productId, color: v?.name, hex: v?.hex };
  };

  return (
    <div>
      <p className="text-sm font-medium">Prendas en esta foto</p>
      <p className="mt-1 text-xs text-muted">Si un modelo lleva un outfit completo, agrega cada prenda con su color.</p>
      {tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {tags.map((t, i) => {
            const l = label(t);
            return (
              <li key={`${t.productId}-${t.variantId}-${i}`} className="inline-flex items-center gap-2 border border-line py-1 pl-2 pr-1 text-xs">
                {l.hex && <span className="h-3 w-3 rounded-full border border-ink/20" style={{ backgroundColor: l.hex }} />}
                {l.name}
                {l.color && <span className="text-muted">· {l.color}</span>}
                <button className="px-1 text-muted hover:text-ink" aria-label={`Quitar ${l.name}`} onClick={() => onChange(tags.filter((_, j) => j !== i))}>
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <select className="field min-h-10 py-1 text-sm" value={productId} onChange={(e) => (setProductId(e.target.value), setVariantId(""))} aria-label="Producto">
          <option value="">Elegir producto…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select className="field min-h-10 py-1 text-sm" value={variantId} onChange={(e) => setVariantId(e.target.value)} disabled={!product} aria-label="Color">
          <option value="">Todos los colores</option>
          {product?.variants.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn-secondary btn-sm shrink-0"
          disabled={!productId}
          onClick={() => {
            const t = { productId, variantId: variantId || null };
            if (!tags.some((x) => x.productId === t.productId && x.variantId === t.variantId)) onChange([...tags, t]);
            setProductId("");
            setVariantId("");
          }}
        >
          Agregar prenda
        </button>
      </div>
    </div>
  );
}
