"use client";

/* eslint-disable @next/next/no-img-element -- miniaturas del panel */
import { useState } from "react";
import { saveHomeSection } from "../../actions";
import { PageHeader } from "@/components/admin/AdminShell";
import { useAdminData } from "@/components/admin/AdminData";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { Card, Spinner, toast } from "@/components/admin/ui";
import type { MediaKind } from "@/lib/catalog/types";

export type SectionDef = { key: string; title: string; description: string; single?: boolean; texts?: boolean; link?: boolean; kind: MediaKind };
type Item = { mediaId: string; title: string; subtitle: string; href: string };

export function HomeImagesEditor({ sections, initial }: { sections: SectionDef[]; initial: Record<string, Item[]> }) {
  return (
    <>
      <PageHeader
        title="Imágenes de la página principal"
        description="Cambia las fotos del inicio. Al guardar cada sección, la tienda se actualiza al instante. Si una sección queda vacía, se muestra el diseño por defecto."
        actions={<a href="/" target="_blank" className="btn-secondary">Ver inicio ↗</a>}
      />
      <div className="space-y-6">
        {sections.map((s) => (
          <SectionEditor key={s.key} def={s} initial={initial[s.key] ?? []} />
        ))}
      </div>
    </>
  );
}

function SectionEditor({ def, initial }: { def: SectionDef; initial: Item[] }) {
  const { byId } = useAdminData();
  const [items, setItems] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(items) !== saved;

  const update = (i: number, patch: Partial<Item>) => setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(to, 0, x);
    setItems(next);
  };

  const save = async () => {
    setSaving(true);
    const r = await saveHomeSection(def.key, items);
    setSaving(false);
    if (!r.ok) return toast("error", r.error);
    setSaved(JSON.stringify(items));
    toast("ok", `${def.title}: guardado. Ya se ve en la tienda.`);
  };

  return (
    <Card
      title={def.title}
      description={def.description}
      actions={
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" onClick={() => setPicker(true)}>{def.single ? (items.length ? "Cambiar foto" : "Elegir foto") : "+ Agregar fotos"}</button>
          <button className="btn-primary btn-sm" disabled={!dirty || saving} onClick={save}>{saving ? <Spinner /> : dirty ? "Guardar" : "Guardado"}</button>
        </div>
      }
    >
      {items.length === 0 ? (
        <p className="border border-dashed border-line px-4 py-6 text-center text-sm text-muted">Sin imagen: se usa el diseño por defecto.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it, i) => {
            const m = byId.get(it.mediaId);
            return (
              <li key={`${it.mediaId}-${i}`} className="flex flex-col gap-3 border border-line p-3 sm:flex-row">
                <div className="w-full shrink-0 overflow-hidden bg-stone sm:w-40">{m ? <img src={m.url} alt={m.alt} className="aspect-[4/3] w-full object-cover" /> : <span className="block p-4 text-xs text-muted">Foto eliminada</span>}</div>
                <div className="flex-1 space-y-2">
                  {def.texts && (
                    <>
                      <input className="field min-h-10 py-1 text-sm" placeholder="Título (opcional)" maxLength={120} value={it.title} onChange={(e) => update(i, { title: e.target.value })} aria-label="Título" />
                      <input className="field min-h-10 py-1 text-sm" placeholder="Texto (opcional)" maxLength={240} value={it.subtitle} onChange={(e) => update(i, { subtitle: e.target.value })} aria-label="Texto" />
                    </>
                  )}
                  {def.link && (
                    <input className="field min-h-10 py-1 text-sm" placeholder="Enlace (opcional): /frma-01 o /producto/polera-essential" maxLength={300} value={it.href} onChange={(e) => update(i, { href: e.target.value })} aria-label="Enlace" />
                  )}
                  {m && !m.alt && <p className="text-xs text-amber-800">Esta foto no tiene texto alternativo (edítalo en la Biblioteca).</p>}
                </div>
                <div className="flex items-start gap-1 text-sm">
                  {!def.single && (
                    <>
                      <button className="px-2 py-1 text-muted hover:text-ink disabled:opacity-25" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Subir">▲</button>
                      <button className="px-2 py-1 text-muted hover:text-ink disabled:opacity-25" disabled={i === items.length - 1} onClick={() => move(i, i + 1)} aria-label="Bajar">▼</button>
                    </>
                  )}
                  <button className="px-2 py-1 text-muted hover:text-red-700" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Quitar">Quitar</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <MediaPicker
        open={picker}
        onClose={() => setPicker(false)}
        multiple={!def.single}
        defaultKind={def.kind}
        title={def.title}
        altFor={() => `FRMA: ${def.title.toLowerCase()}`}
        onSelect={(sel) => {
          const add = sel.map((m) => ({ mediaId: m.id, title: "", subtitle: "", href: "" }));
          setItems(def.single ? add.slice(0, 1) : [...items, ...add]);
        }}
      />
    </Card>
  );
}
