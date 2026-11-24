"use client";

/* eslint-disable @next/next/no-img-element -- miniaturas del panel */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCollection, deleteCollection } from "../../actions";
import { PageHeader } from "@/components/admin/AdminShell";
import { confirmAction, Field, Modal, StatusBadge, toast } from "@/components/admin/ui";
import type { Collection } from "@/lib/catalog/types";
import { formatCLP } from "@/lib/format";

export function CollectionsList({ collections }: { collections: Collection[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  return (
    <>
      <PageHeader
        title="Guardarropas y colecciones"
        description="Conjuntos de prendas que se venden juntos (como FRMA 01). Las combinaciones se calculan solas: prendas superiores × pantalones."
        actions={<button className="btn-primary" onClick={() => setCreating(true)}>+ Nuevo guardarropa</button>}
      />
      {collections.length === 0 ? (
        <p className="border border-line bg-paper p-10 text-center text-sm text-muted">Aún no hay guardarropas.</p>
      ) : (
        <ul className="divide-y divide-line border border-line bg-paper">
          {collections.map((c) => {
            const cover = c.heroImage ?? c.images[0];
            return (
              <li key={c.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <Link href={`/admin/colecciones/${c.id}`} className="flex flex-1 items-center gap-4">
                  <span className="h-16 w-20 shrink-0 overflow-hidden bg-stone">{cover && <img src={cover.src} alt="" className="h-full w-full object-cover" />}</span>
                  <span>
                    <span className="block font-medium">{c.name}</span>
                    <span className="block text-xs text-muted">
                      {c.pieces.length} piezas · {formatCLP(c.price)} · {c.id === "frma-01" ? "/frma-01" : `/guardarropa/${c.id}`}
                    </span>
                    <span className="mt-1 block"><StatusBadge status={c.status} /></span>
                  </span>
                </Link>
                <div className="flex gap-2">
                  <Link href={`/admin/colecciones/${c.id}`} className="btn-primary btn-sm">Editar</Link>
                  <button
                    className="btn-ghost btn-sm text-red-700"
                    onClick={async () => {
                      if (!(await confirmAction({ title: `¿Eliminar «${c.name}»?`, body: "Los productos y fotos no se eliminan.", confirm: "Eliminar", danger: true }))) return;
                      const r = await deleteCollection(c.id);
                      if (!r.ok) return toast("error", r.error);
                      toast("ok", "Guardarropa eliminado.");
                      router.refresh();
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
      <Modal open={creating} onClose={() => setCreating(false)} title="Nuevo guardarropa" size="sm">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await createCollection(name);
            if (!r.ok) return toast("error", r.error);
            toast("ok", "Guardarropa creado como borrador.");
            setCreating(false);
            router.push(`/admin/colecciones/${r.data.id}`);
          }}
        >
          <Field label="Nombre" htmlFor="nc-name">
            <input id="nc-name" className="field" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: FRMA 02 Verano" autoFocus />
          </Field>
          <button className="btn-primary w-full" disabled={!name.trim()}>Crear y continuar</button>
        </form>
      </Modal>
    </>
  );
}
