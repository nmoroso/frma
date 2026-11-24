import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CollectionDetail } from "@/components/collection/CollectionDetail";
import { findCollection, MAIN_COLLECTION_ID } from "@/lib/catalog/helpers";
import { getCatalog } from "@/lib/catalog/server";

export async function generateStaticParams() {
  const catalog = await getCatalog();
  const ids = catalog.collections.filter((c) => c.id !== MAIN_COLLECTION_ID).map((c) => ({ id: c.id }));
  // Next exige al menos un parámetro para prerenderizar la ruta.
  return ids.length ? ids : [{ id: MAIN_COLLECTION_ID }];
}

export async function generateMetadata({ params }: PageProps<"/guardarropa/[id]">): Promise<Metadata> {
  const { id } = await params;
  const c = findCollection(await getCatalog(), id);
  return c ? { title: `${c.name} — Guardarropa`, description: c.tagline } : { title: "Guardarropa no encontrado" };
}

export default function CollectionPage({ params }: PageProps<"/guardarropa/[id]">) {
  return (
    <Suspense fallback={<div className="container-frma min-h-[70vh]" />}>
      <CollectionRoute params={params} />
    </Suspense>
  );
}

async function CollectionRoute({ params }: Pick<PageProps<"/guardarropa/[id]">, "params">) {
  const { id } = await params;
  if (id === MAIN_COLLECTION_ID) redirect("/frma-01");
  const c = findCollection(await getCatalog(), id);
  if (!c) notFound();
  return <CollectionDetail key={c.id} collectionId={c.id} />;
}
