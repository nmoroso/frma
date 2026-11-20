import Image from "next/image";
import type { GarmentShape, ProductImage } from "@/config/catalog";

/**
 * Muestra la foto del producto si existe en el catálogo; si no, una
 * ilustración neutra (placeholder) del tipo de prenda en su color.
 * Las imágenes marcadas como `conceptual` llevan una etiqueta visible.
 */
export function ProductVisual({
  shape,
  hex,
  image,
  alt,
  className = "",
  label = false,
  priority = false,
  sizes = "(min-width: 1024px) 33vw, 50vw",
}: {
  shape: GarmentShape;
  hex: string;
  image?: ProductImage;
  alt: string;
  className?: string;
  label?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  const light = isLight(hex);
  return (
    <div
      className={`relative overflow-hidden ${light ? "bg-sand" : "bg-ivory"} ${className}`}
    >
      {image ? (
        <Image src={image.src} alt={image.alt || alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <Garment shape={shape} hex={hex} title={alt} />
      )}
      {image?.conceptual && (
        <span className="absolute left-3 top-3 bg-paper/90 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-muted">
          Imagen conceptual
        </span>
      )}
      {!image && label && (
        <span className="absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.14em] text-muted/80">
          Ilustración · fotografía próximamente
        </span>
      )}
    </div>
  );
}

export function Garment({ shape, hex, title }: { shape: GarmentShape; hex: string; title?: string }) {
  const stroke = isLight(hex) ? "rgba(22,22,26,0.18)" : "rgba(0,0,0,0.25)";
  const detail = isLight(hex) ? "rgba(22,22,26,0.16)" : "rgba(255,255,255,0.14)";
  const id = `g-${shape}-${hex.replace("#", "")}`;
  return (
    <svg
      viewBox="0 0 200 240"
      role="img"
      aria-label={title}
      className="absolute inset-0 m-auto h-[78%] w-[78%] drop-shadow-[0_18px_22px_rgba(0,0,0,0.10)]"
    >
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.10" />
        </linearGradient>
      </defs>
      {shape === "tee" && (
        <g strokeLinejoin="round">
          <path d={TEE} fill={hex} stroke={stroke} strokeWidth="1" />
          <path d={TEE} fill={`url(#${id})`} />
          <path d="M82 31 Q100 46 118 31" fill="none" stroke={detail} strokeWidth="2" />
        </g>
      )}
      {shape === "polo" && (
        <g strokeLinejoin="round">
          <path d={TEE} fill={hex} stroke={stroke} strokeWidth="1" />
          <path d={TEE} fill={`url(#${id})`} />
          <path d="M82 31 L100 52 L92 60 L78 38 Z M118 31 L100 52 L108 60 L122 38 Z" fill={hex} stroke={stroke} strokeWidth="1" />
          <path d="M100 52 L100 82" stroke={detail} strokeWidth="1.5" />
          <circle cx="100" cy="62" r="1.8" fill={detail} />
          <circle cx="100" cy="74" r="1.8" fill={detail} />
        </g>
      )}
      {shape === "shirt" && (
        <g strokeLinejoin="round">
          <path d={SHIRT} fill={hex} stroke={stroke} strokeWidth="1" />
          <path d={SHIRT} fill={`url(#${id})`} />
          <path d="M84 30 L100 48 L90 58 L78 36 Z M116 30 L100 48 L110 58 L122 36 Z" fill={hex} stroke={stroke} strokeWidth="1" />
          <path d="M100 48 L100 208" stroke={detail} strokeWidth="1.5" />
          {[72, 100, 128, 156, 184].map((y) => (
            <circle key={y} cx="104" cy={y} r="1.8" fill={detail} />
          ))}
          <path d="M66 96 L86 96 L86 116 L66 116" fill="none" stroke={detail} strokeWidth="1.2" />
        </g>
      )}
      {shape === "chino" && (
        <g strokeLinejoin="round">
          <path d={CHINO} fill={hex} stroke={stroke} strokeWidth="1" />
          <path d={CHINO} fill={`url(#${id})`} />
          <path d="M64 44 L136 44" stroke={detail} strokeWidth="1.5" />
          <path d="M66 50 Q78 72 70 92 M134 50 Q122 72 130 92" fill="none" stroke={detail} strokeWidth="1.2" />
          <path d="M100 44 L100 86" stroke={detail} strokeWidth="1.2" />
          <path d="M80 100 L76 206 M120 100 L124 206" stroke={detail} strokeWidth="0.8" />
        </g>
      )}
    </svg>
  );
}

const TEE =
  "M62 38 L82 28 Q100 42 118 28 L138 38 L172 66 L154 92 L140 82 L140 206 Q100 212 60 206 L60 82 L46 92 L28 66 Z";
const SHIRT =
  "M60 38 L84 28 L100 44 L116 28 L140 38 L162 62 L178 186 L160 190 L142 96 L142 210 Q100 216 58 210 L58 96 L40 190 L22 186 L38 62 Z";
const CHINO = "M64 30 L136 30 L144 212 L110 214 L100 94 L90 214 L56 212 Z";

export function isLight(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}
