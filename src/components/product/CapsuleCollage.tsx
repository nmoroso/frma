import { CAPSULE, capsulePieces } from "@/config/catalog";
import { ProductVisual } from "./ProductVisual";

/** Composición de las 7 piezas de la cápsula (o su imagen hero si está configurada). */
export function CapsuleCollage({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  if (CAPSULE.heroImage) {
    return (
      <ProductVisual
        shape="tee"
        hex="#E9E3D8"
        image={CAPSULE.heroImage}
        alt={CAPSULE.name}
        className={className}
        priority={priority}
      />
    );
  }
  const pieces = capsulePieces();
  const tops = pieces.filter((p) => p.role === "top");
  const bottoms = pieces.filter((p) => p.role === "bottom");
  return (
    <div className={`grid grid-cols-5 grid-rows-2 gap-1.5 bg-paper ${className}`} aria-label={`Piezas de ${CAPSULE.name}`} role="img">
      {tops.map((p, i) => (
        <ProductVisual
          key={`t-${i}`}
          shape={p.product.shape}
          hex={p.color.hex}
          image={p.color.images[0]}
          alt={`${p.product.name} ${p.color.name}`}
          sizes="20vw"
        />
      ))}
      {bottoms.map((p, i) => (
        <ProductVisual
          key={`b-${i}`}
          shape={p.product.shape}
          hex={p.color.hex}
          image={p.color.images[0]}
          alt={`${p.product.name} ${p.color.name}`}
          className={i === 0 ? "col-span-3" : "col-span-2"}
          sizes="40vw"
        />
      ))}
    </div>
  );
}
