import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { getCatalog } from "@/lib/catalog/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await getCatalog();
  const pages = ["", "/catalogo", "/frma-01", "/prelanzamiento", "/privacidad", "/contacto"];
  return [
    ...pages.map((p) => ({ url: `${SITE.url}${p}` })),
    ...catalog.products.map((p) => ({ url: `${SITE.url}/producto/${p.id}` })),
    ...catalog.collections.filter((c) => c.id !== "frma-01").map((c) => ({ url: `${SITE.url}/guardarropa/${c.id}` })),
  ];
}
