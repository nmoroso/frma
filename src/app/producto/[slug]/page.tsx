import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProductBySlug, PRODUCTS } from "@/config/catalog";
import { ProductDetail } from "./ProductDetail";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  return { title: product.name, description: `${product.tagline} ${product.description}` };
}

export default async function ProductPage({ params }: PageProps<"/producto/[slug]">) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  return (
    <Suspense fallback={<div className="container-frma min-h-[70vh]" />}>
      <ProductDetail key={product.slug} slug={product.slug} />
    </Suspense>
  );
}
