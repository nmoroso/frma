import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductDetail } from "@/app/producto/[slug]/ProductDetail";
import { loadAdminCatalog } from "@/lib/admin/data";
import { CatalogProvider } from "@/lib/catalog/context";
import { getCatalog } from "@/lib/catalog/server";
import { requireAdminPage } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Vista previa", robots: { index: false, follow: false } };

/** Vista previa de un producto (también borradores). Solo administradores. No registra analítica. */
export default function PreviewPage({ params }: PageProps<"/admin/vista-previa/[id]">) {
  return (
    <Suspense fallback={<p className="container-frma py-10 text-sm text-muted">Cargando vista previa…</p>}>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: { params: PageProps<"/admin/vista-previa/[id]">["params"] }) {
  await requireAdminPage();
  const { id } = await params;
  const [admin, store] = await Promise.all([loadAdminCatalog(), getCatalog()]);
  const product = admin.products.find((p) => p.id === id);
  if (!product) notFound();
  const catalog = { ...store, products: [...store.products.filter((p) => p.id !== id), { ...product, variants: product.variants.filter((v) => v.active) }] };
  return (
    <>
      <div className="bg-amber-100 px-4 py-3 text-center text-sm text-amber-950">
        Vista previa{product.status === "draft" ? " de un borrador: aún no se ve en la tienda" : ""}. Lo que ves aquí es lo que verán los clientes.{" "}
        <Link href={`/admin/productos/${id}`} className="underline">Volver al editor</Link>
      </div>
      {product.variants.some((v) => v.active) ? (
        <CatalogProvider catalog={catalog}>
          <Suspense>
            <ProductDetail productId={id} />
          </Suspense>
        </CatalogProvider>
      ) : (
        <p className="container-frma py-16 text-center text-sm text-muted">Agrega al menos un color activo para ver la vista previa.</p>
      )}
    </>
  );
}
