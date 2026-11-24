import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { findProduct } from "@/lib/catalog/helpers";
import { getCatalog } from "@/lib/catalog/server";
import { ProductDetail } from "./ProductDetail";

export async function generateStaticParams() {
  const catalog = await getCatalog();
  const params = catalog.products.map((p) => ({ slug: p.id }));
  // Debe haber al menos uno; los productos creados después del despliegue se
  // generan al primer visitante (sin volver a desplegar).
  return params.length ? params : [{ slug: "polera-essential" }];
}

export async function generateMetadata({ params }: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = findProduct(await getCatalog(), slug);
  if (!product) return { title: "Producto no encontrado" };
  const img = product.variants[0]?.images[0];
  return {
    title: product.name,
    description: `${product.tagline} ${product.description}`.trim(),
    ...(img ? { openGraph: { images: [{ url: img.src, alt: img.alt }] } } : {}),
  };
}

export default function ProductPage({ params }: PageProps<"/producto/[slug]">) {
  // La URL se lee dentro de <Suspense> (Cache Components + Partial Prefetching).
  return (
    <Suspense fallback={<div className="container-frma min-h-[70vh]" />}>
      <ProductRoute params={params} />
    </Suspense>
  );
}

async function ProductRoute({ params }: Pick<PageProps<"/producto/[slug]">, "params">) {
  const { slug } = await params;
  const product = findProduct(await getCatalog(), slug);
  if (!product) notFound();
  return <ProductDetail key={product.id} productId={product.id} />;
}
