import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionDetail } from "@/components/collection/CollectionDetail";
import { findCollection, MAIN_COLLECTION_ID } from "@/lib/catalog/helpers";
import { getCatalog } from "@/lib/catalog/server";

export async function generateMetadata(): Promise<Metadata> {
  const c = findCollection(await getCatalog(), MAIN_COLLECTION_ID);
  return c ? { title: `${c.name} — Guardarropa cápsula`, description: c.tagline } : {};
}

export default async function MainCapsulePage() {
  const c = findCollection(await getCatalog(), MAIN_COLLECTION_ID);
  if (!c) notFound();
  return <CollectionDetail key={c.id} collectionId={c.id} />;
}
