import Link from "next/link";
import { PageHeader } from "@/components/admin/AdminShell";
import { PanelGate } from "@/components/admin/PanelGate";
import { ImportSeedButton } from "./ImportSeedButton";

export default function AdminHome() {
  return (
    <PanelGate>
      {({ catalog, library }) => {
        const published = catalog.products.filter((p) => p.status === "published").length;
        const drafts = catalog.products.length - published;
        const variants = catalog.products.reduce((s, p) => s + p.variants.length, 0);
        const withoutPhotos = catalog.products.flatMap((p) => p.variants.filter((v) => v.active && v.images.length === 0).map((v) => `${p.name} · ${v.name}`));
        return (
          <>
            <PageHeader title="Panel de FRMA" description="Administra productos, colores y fotografías. Los cambios publicados se ven en la tienda al instante, sin programar ni volver a desplegar." />

            {catalog.products.length === 0 && (
              <div className="mb-8 border border-ink bg-paper p-6">
                <h2 className="text-lg font-medium">Paso 1: importar el catálogo actual</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted">
                  Copia a la base de datos los 4 productos originales con sus 9 colores, precios y textos, el guardarropa FRMA 01 y los 3 modelos. Mientras no lo hagas, la tienda sigue mostrando el catálogo original.
                </p>
                <div className="mt-4">
                  <ImportSeedButton />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Productos publicados" value={published} href="/admin/productos" />
              <Stat label="Borradores" value={drafts} href="/admin/productos" />
              <Stat label="Colores" value={variants} href="/admin/productos" />
              <Stat label="Fotos en biblioteca" value={library.length} href="/admin/imagenes" />
            </div>

            {withoutPhotos.length > 0 && (
              <div className="mt-8 border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
                <p className="font-medium">Colores activos sin fotos ({withoutPhotos.length})</p>
                <p className="mt-1">En la tienda muestran una ilustración en lugar de una foto: {withoutPhotos.slice(0, 8).join(", ")}{withoutPhotos.length > 8 ? "…" : ""}.</p>
              </div>
            )}

            <section className="mt-10">
              <h2 className="text-sm font-medium uppercase tracking-[0.14em]">Cómo cargar un producto</h2>
              <ol className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {[
                  "Entra a Productos y elige uno, o crea uno nuevo.",
                  "En «Colores», agrega un color.",
                  "Elige el tono con el selector o con el cuentagotas sobre la foto.",
                  "Sube las fotos de ese color (puedes arrastrar varias).",
                  "Ordénalas arrastrando y marca la principal con ★.",
                  "Guarda, revisa la vista previa y publica.",
                ].map((t, i) => (
                  <li key={t} className="flex gap-3 border border-line bg-paper p-4">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs text-paper">{i + 1}</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
              <Link href="/admin/productos" className="btn-primary mt-6">Ir a productos</Link>
            </section>
          </>
        );
      }}
    </PanelGate>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="border border-line bg-paper p-4 hover:border-ink">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-3xl font-light tabular-nums">{value}</p>
    </Link>
  );
}
