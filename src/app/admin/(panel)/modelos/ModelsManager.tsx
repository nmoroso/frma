"use client";

/* eslint-disable @next/next/no-img-element -- miniaturas del panel */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createModel, deleteModel, saveModel } from "../../actions";
import { PageHeader } from "@/components/admin/AdminShell";
import { useAdminData } from "@/components/admin/AdminData";
import { MediaEditModal } from "@/components/admin/MediaEditModal";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { SortableGallery } from "@/components/admin/SortableGallery";
import { Card, confirmAction, Field, Spinner, toast, useUnsavedWarning } from "@/components/admin/ui";
import type { MediaItem, ModelItem } from "@/lib/admin/data";
import { isLight } from "@/lib/catalog/helpers";

export function ModelsManager({ models }: { models: ModelItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeader
        title="Modelos"
        description="Los modelos ficticios de FRMA. Sube sus fotos y marca qué prendas (producto y color) lleva en cada una; una foto de outfit puede tener varias prendas."
        actions={
          <button
            className="btn-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const r = await createModel(`Modelo ${models.length + 1}`);
              setBusy(false);
              if (!r.ok) return toast("error", r.error);
              toast("ok", "Modelo creado.");
              router.refresh();
            }}
          >
            + Nuevo modelo
          </button>
        }
      />
      {models.length === 0 ? (
        <p className="border border-line bg-paper p-10 text-center text-sm text-muted">Aún no hay modelos. Importa el catálogo inicial desde el Resumen (crea 3) o crea uno nuevo.</p>
      ) : (
        <div className="space-y-6">
          {models.map((m) => (
            <ModelEditor key={`${m.id}-${m.mediaIds.join()}-${m.referenceMediaId}-${m.name}-${m.age}-${m.notes}`} model={m} />
          ))}
        </div>
      )}
    </>
  );
}

function ModelEditor({ model }: { model: ModelItem }) {
  const router = useRouter();
  const { byId, products } = useAdminData();
  const [m, setM] = useState(model);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<null | "ref" | "gallery">(null);
  const [tagging, setTagging] = useState<MediaItem | null>(null);
  const dirty = JSON.stringify(m) !== JSON.stringify(model);
  useUnsavedWarning(dirty);
  const ref = m.referenceMediaId ? byId.get(m.referenceMediaId) : undefined;
  const photos = m.mediaIds.map((id) => byId.get(id)).filter(Boolean) as MediaItem[];

  // Prendas asociadas = suma de las etiquetas de sus fotos
  const associated = new Map<string, { name: string; color?: string; hex?: string; count: number }>();
  for (const p of photos)
    for (const t of p.tags) {
      const prod = products.find((x) => x.id === t.productId);
      const v = prod?.variants.find((x) => x.id === t.variantId);
      const k = `${t.productId}:${t.variantId ?? ""}`;
      const cur = associated.get(k) ?? { name: prod?.name ?? t.productId, color: v?.name, hex: v?.hex, count: 0 };
      cur.count++;
      associated.set(k, cur);
    }

  const save = async () => {
    setSaving(true);
    const r = await saveModel(m);
    setSaving(false);
    if (!r.ok) return toast("error", r.error);
    toast("ok", `${m.name} guardado.`);
    router.refresh();
  };

  return (
    <Card
      title={m.name || "Modelo"}
      description={m.age ? `${m.age} años` : undefined}
      actions={
        <div className="flex gap-2">
          <button className="btn-primary btn-sm" disabled={!dirty || saving} onClick={save}>{saving ? <Spinner /> : dirty ? "Guardar cambios" : "Guardado"}</button>
          <button
            className="btn-ghost btn-sm text-red-700"
            onClick={async () => {
              if (!(await confirmAction({ title: `¿Eliminar a ${m.name}?`, body: "Sus fotos seguirán en la biblioteca.", confirm: "Eliminar modelo", danger: true }))) return;
              const r = await deleteModel(m.id);
              if (!r.ok) return toast("error", r.error);
              toast("ok", "Modelo eliminado.");
              router.refresh();
            }}
          >
            Eliminar
          </button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <div>
          <p className="text-sm font-medium">Foto de referencia</p>
          <button type="button" onClick={() => setPicker("ref")} className="mt-2 block aspect-[3/4] w-full overflow-hidden border border-dashed border-line bg-stone text-xs text-muted hover:border-ink">
            {ref ? <img src={ref.url} alt={ref.alt} className="h-full w-full object-cover" /> : "Elegir foto"}
          </button>
          {ref && (
            <button type="button" className="mt-1 text-xs text-muted hover:text-ink" onClick={() => setM({ ...m, referenceMediaId: null })}>
              Quitar
            </button>
          )}
        </div>
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <Field label="Nombre o identificador interno" htmlFor={`${m.id}-n`}>
              <input id={`${m.id}-n`} className="field" maxLength={80} value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} />
            </Field>
            <Field label="Edad aprox." htmlFor={`${m.id}-a`}>
              <input id={`${m.id}-a`} className="field" type="number" min={16} max={90} value={m.age ?? ""} onChange={(e) => setM({ ...m, age: e.target.value ? Number(e.target.value) : null })} />
            </Field>
          </div>
          <Field label="Notas (estatura, talla que usa, estilo…)" htmlFor={`${m.id}-no`}>
            <input id={`${m.id}-no`} className="field" maxLength={1000} value={m.notes} onChange={(e) => setM({ ...m, notes: e.target.value })} />
          </Field>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Galería ({photos.length})</p>
                <p className="text-xs text-muted">Usa ✎ en cada foto para indicar qué prendas lleva (producto y color).</p>
              </div>
              <button className="btn-primary btn-sm" onClick={() => setPicker("gallery")}>+ Agregar fotos</button>
            </div>
            <SortableGallery ids={m.mediaIds} onChange={(ids) => setM({ ...m, mediaIds: ids })} showPrincipal={false} emptyText="Sin fotos todavía." />
          </div>

          {photos.some((p) => p.tags.length === 0) && (
            <div className="border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
              {photos.filter((p) => p.tags.length === 0).length} foto(s) sin prendas asignadas.{" "}
              <button className="underline" onClick={() => setTagging(photos.find((p) => p.tags.length === 0)!)}>Asignar ahora</button>
            </div>
          )}

          <div>
            <p className="text-sm font-medium">Productos y colores asociados</p>
            {associated.size === 0 ? (
              <p className="mt-1 text-sm text-muted">Ninguno todavía.</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {[...associated.values()].map((a) => (
                  <li key={`${a.name}-${a.color}`} className="inline-flex items-center gap-2 border border-line px-2 py-1 text-xs">
                    {a.hex && <span className={`h-3 w-3 rounded-full ${isLight(a.hex) ? "border border-ink/30" : ""}`} style={{ backgroundColor: a.hex }} />}
                    {a.name}
                    {a.color && <span className="text-muted">· {a.color}</span>}
                    <span className="text-muted">({a.count})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <MediaPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        multiple={picker === "gallery"}
        defaultKind="modelo"
        exclude={picker === "gallery" ? m.mediaIds : []}
        title={picker === "ref" ? `Foto de referencia de ${m.name}` : `Fotos de ${m.name}`}
        altFor={(_f, i) => `${m.name} con prendas FRMA${i ? ` — foto ${i + 1}` : ""}`}
        onSelect={(items) => {
          if (picker === "ref") setM({ ...m, referenceMediaId: items[0]?.id ?? null });
          else {
            setM({ ...m, mediaIds: [...m.mediaIds, ...items.map((x) => x.id)] });
            if (items[0]) setTagging(items[0]);
          }
        }}
      />
      <MediaEditModal media={tagging} onClose={() => setTagging(null)} />
    </Card>
  );
}
