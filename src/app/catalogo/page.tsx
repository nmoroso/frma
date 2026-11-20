import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogClient } from "./CatalogClient";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Poleras, chinos, polos y camisas oxford. Prendas esenciales y combinables.",
};

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="container-frma min-h-[60vh] pt-14" />}>
      <CatalogClient />
    </Suspense>
  );
}
