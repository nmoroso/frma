import { describe, expect, it } from "vitest";
import { PRICES } from "@/config/pricing";
import { EXPERIMENTS, type Experiment } from "@/config/experiments";
import { addLine, count, removeLine, sanitize, setQuantity, subtotal, MAX_QTY, type CartLine } from "@/lib/cart/cart";
import { lineInfo } from "@/lib/cart/lines";
import { collectionOutfits, collectionPieces, collectionSeparatePrice, findCollection, findProduct, isLight, pickVariant, slugify } from "@/lib/catalog/helpers";
import { seedCatalog } from "@/lib/catalog/seed";
import { experimentParams, pickVariant as pickExpVariant, resolvePrice } from "@/lib/experiments";
import { formatCLP } from "@/lib/format";
import { parseAttribution } from "@/lib/analytics/attribution";
import { csvCell } from "@/lib/csv";

const catalog = seedCatalog();
const capsule = findCollection(catalog, "frma-01")!;

describe("catálogo inicial (migración)", () => {
  it("conserva las 4 familias con sus colores y precios", () => {
    const colors = Object.fromEntries(catalog.products.map((p) => [p.id, p.variants.map((v) => v.slug)]));
    expect(colors).toEqual({
      "polera-essential": ["blanco", "azul-marino", "gris-carbon"],
      "chino-everyday": ["beige", "azul-marino"],
      "polo-classic": ["azul-marino", "crudo"],
      "camisa-oxford": ["celeste", "blanco"],
    });
    expect(Object.fromEntries(catalog.products.map((p) => [p.id, p.price]))).toEqual({
      "polera-essential": 19990,
      "chino-everyday": 39990,
      "polo-classic": 29990,
      "camisa-oxford": 34990,
    });
    expect(capsule.price).toBe(179990);
    // SKU únicos
    const skus = catalog.products.flatMap((p) => p.variants.map((v) => v.sku));
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("FRMA 01 tiene 7 piezas (3 poleras, 2 chinos, 1 polo, 1 camisa) y 10 combinaciones", () => {
    const pieces = collectionPieces(catalog, capsule);
    expect(pieces).toHaveLength(7);
    const by = (id: string) => pieces.filter((p) => p.product.id === id).length;
    expect([by("polera-essential"), by("chino-everyday"), by("polo-classic"), by("camisa-oxford")]).toEqual([3, 2, 1, 1]);
    expect(collectionOutfits(catalog, capsule)).toHaveLength(10);
  });

  it("precio por separado y ahorro de la cápsula", () => {
    expect(collectionSeparatePrice(catalog, capsule, (_id, base) => base)).toBe(204930);
  });

  it("formatea CLP", () => {
    expect(formatCLP(19990)).toBe("$19.990");
    expect(formatCLP(179990)).toBe("$179.990");
  });
});

describe("variantes de color", () => {
  const tee = findProduct(catalog, "polera-essential")!;
  it("elige la variante por slug o la primera activa", () => {
    expect(pickVariant(tee, "azul-marino")?.name).toBe("Azul marino");
    expect(pickVariant(tee, "no-existe")?.slug).toBe("blanco");
    const withInactive = { ...tee, variants: tee.variants.map((v, i) => (i === 0 ? { ...v, active: false } : v)) };
    expect(pickVariant(withInactive, null)?.slug).toBe("azul-marino");
  });
  it("detecta colores claros (necesitan borde visible)", () => {
    expect(isLight("#FFFFFF")).toBe(true);
    expect(isLight("#F4F2EE")).toBe(true);
    expect(isLight("#202C40")).toBe(false);
  });
  it("genera slugs sin tildes", () => {
    expect(slugify("Gris Carbón")).toBe("gris-carbon");
    expect(slugify("  Azul   marino ")).toBe("azul-marino");
  });
});

describe("carrito", () => {
  const tee = { id: "polera-essential", kind: "product" as const, colorId: "blanco", size: "M", quantity: 1 };

  it("agrega, agrupa líneas iguales y separa colores y tallas", () => {
    let lines = addLine([], tee);
    lines = addLine(lines, tee);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(2);
    lines = addLine(lines, { ...tee, size: "L" });
    lines = addLine(lines, { ...tee, colorId: "azul-marino" });
    expect(lines).toHaveLength(3);
    expect(count(lines)).toBe(4);
  });

  it("modifica cantidades con límites y elimina", () => {
    let lines = addLine([], tee);
    const key = lines[0].key;
    lines = setQuantity(lines, key, 99);
    expect(lines[0].quantity).toBe(MAX_QTY);
    lines = setQuantity(lines, key, 0);
    expect(lines).toHaveLength(0);
    lines = removeLine(addLine([], tee), key);
    expect(lines).toHaveLength(0);
  });

  it("calcula subtotal con precio por color", () => {
    let lines = addLine([], { ...tee, quantity: 2 });
    lines = addLine(lines, { id: "frma-01", kind: "capsule", topSize: "M", bottomSize: "42", quantity: 1 });
    expect(subtotal(lines, (l) => lineInfo(l, catalog)!.base)).toBe(2 * 19990 + 179990);
    // Un color con precio específico
    const special = { ...catalog, products: catalog.products.map((p) => (p.id === "polera-essential" ? { ...p, variants: p.variants.map((v) => (v.slug === "blanco" ? { ...v, price: 24990 } : v)) } : p)) };
    expect(lineInfo(lines[0], special)!.base).toBe(24990);
  });

  it("descarta líneas que ya no se pueden comprar", () => {
    const bad = [
      { id: "inexistente", kind: "product", quantity: 1, key: "a" },
      { ...tee, colorId: "rojo", key: "b" },
      { ...tee, size: "XXXL", key: "c" },
      { ...tee, key: "ok" },
      { id: "frma-01", kind: "capsule", topSize: "M", bottomSize: "42", quantity: 1, key: "cap" },
      null,
      "x",
    ];
    expect(sanitize(bad, catalog).map((l: CartLine) => l.key)).toEqual(["ok", "cap"]);
    const inactive = { ...catalog, products: catalog.products.map((p) => ({ ...p, variants: p.variants.map((v) => ({ ...v, active: v.slug !== "blanco" })) })) };
    expect(sanitize([{ ...tee, key: "ok" }], inactive)).toHaveLength(0);
    expect(sanitize("basura", catalog)).toEqual([]);
  });
});

describe("experimentos", () => {
  const exp: Experiment = {
    id: "test",
    enabled: true,
    type: "price",
    description: "",
    variants: [
      { id: "a", weight: 50 },
      { id: "b", weight: 50, prices: { "frma-01": 159990 } },
    ],
  };

  it("vienen desactivados por defecto", () => {
    expect(EXPERIMENTS.every((e) => !e.enabled)).toBe(true);
  });

  it("asigna variantes según peso", () => {
    expect(pickExpVariant(exp, 0.1).id).toBe("a");
    expect(pickExpVariant(exp, 0.9).id).toBe("b");
  });

  it("resuelve precio por variante sin afectar otros productos", () => {
    expect(resolvePrice("frma-01", PRICES["frma-01"], { test: "b" }, [exp])).toBe(159990);
    expect(resolvePrice("frma-01", PRICES["frma-01"], { test: "a" }, [exp])).toBe(179990);
    expect(resolvePrice("polera-essential", 19990, { test: "b" }, [exp])).toBe(19990);
  });

  it("genera experiment_id y variant_id para eventos", () => {
    expect(experimentParams({})).toEqual({});
    expect(experimentParams({ test: "b" })).toEqual({ experiment_id: "test", variant_id: "b", experiment_variant_id: "b" });
  });
});

describe("atribución", () => {
  it("extrae UTM y fbclid, ignora otros parámetros", () => {
    const a = parseAttribution("?utm_source=instagram&utm_medium=paid_social&utm_campaign=frma01_nov&utm_content=reel_a&fbclid=AbC123&email=x@y.cl");
    expect(a).toEqual({ utm_source: "instagram", utm_medium: "paid_social", utm_campaign: "frma01_nov", utm_content: "reel_a", fbclid: "AbC123" });
  });

  it("limpia caracteres peligrosos y largo", () => {
    const a = parseAttribution(`?utm_source=<script>alert(1)</script>&utm_campaign=${"x".repeat(500)}`);
    expect(a.utm_source).not.toContain("<");
    expect(a.utm_campaign!.length).toBeLessThanOrEqual(150);
  });
});

describe("CSV", () => {
  it("escapa comillas y neutraliza fórmulas", () => {
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell('a,"b')).toBe('"a,""b"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(["a", "b"])).toBe("a|b");
    expect(csvCell(null)).toBe("");
  });
});
