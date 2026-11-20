import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/config/catalog";
import { SITE } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/catalogo", "/frma-01", "/prelanzamiento", "/privacidad", "/contacto"];
  return [
    ...pages.map((p) => ({ url: `${SITE.url}${p}` })),
    ...PRODUCTS.map((p) => ({ url: `${SITE.url}/producto/${p.slug}` })),
  ];
}
