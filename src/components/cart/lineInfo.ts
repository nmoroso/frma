import { CAPSULE, getColor, getProductById } from "@/config/catalog";
import type { CartLine } from "@/lib/cart/cart";

export function lineInfo(line: CartLine) {
  if (line.kind === "capsule") {
    return {
      name: CAPSULE.name,
      detail: `Talla superior ${line.topSize} · Pantalón ${line.bottomSize}`,
      href: "/frma-01",
      shape: "tee" as const,
      hex: "#E9E3D8",
      image: CAPSULE.heroImage,
      isCapsule: true,
    };
  }
  const product = getProductById(line.id)!;
  const color = getColor(product, line.colorId);
  return {
    name: product.name,
    detail: `${color.name} · Talla ${line.size}`,
    href: `/producto/${product.slug}?color=${color.id}`,
    shape: product.shape,
    hex: color.hex,
    image: color.images[0],
    isCapsule: false,
  };
}
