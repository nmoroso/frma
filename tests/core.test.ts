import { describe, expect, it } from "vitest";
import { CAPSULE, capsuleOutfits, capsulePieces, PRODUCTS } from "@/config/catalog";
import { PRICES } from "@/config/pricing";
import { EXPERIMENTS, type Experiment } from "@/config/experiments";
import { addLine, count, removeLine, sanitize, setQuantity, subtotal, MAX_QTY } from "@/lib/cart/cart";
import { experimentParams, pickVariant, resolvePrice } from "@/lib/experiments";
import { formatCLP } from "@/lib/format";
import { parseAttribution } from "@/lib/analytics/attribution";
import { csvCell } from "@/lib/csv";

describe("catálogo", () => {
  it("tiene las 4 familias con sus colores", () => {
    const colors = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.colors.map((c) => c.id)]));
    expect(colors).toEqual({
      "polera-essential": ["blanco", "azul-marino", "gris-carbon"],
      "chino-everyday": ["beige", "azul-marino"],
      "polo-classic": ["azul-marino", "crudo"],
      "camisa-oxford": ["celeste", "blanco"],
    });
  });

  it("FRMA 01 tiene 7 piezas (3 poleras, 2 chinos, 1 polo, 1 camisa) y 10 combinaciones", () => {
    const pieces = capsulePieces();
    expect(pieces).toHaveLength(7);
    const by = (id: string) => pieces.filter((p) => p.productId === id).length;
    expect([by("polera-essential"), by("chino-everyday"), by("polo-classic"), by("camisa-oxford")]).toEqual([3, 2, 1, 1]);
    expect(capsuleOutfits()).toHaveLength(10);
    expect(new Set(capsuleOutfits().map((o) => o.id)).size).toBe(10);
  });

  it("todas las piezas de la cápsula existen en el catálogo", () => {
    for (const p of CAPSULE.pieces) {
      const product = PRODUCTS.find((x) => x.id === p.productId);
      expect(product?.colors.some((c) => c.id === p.colorId)).toBe(true);
    }
  });

  it("precios provisionales y ahorro de la cápsula", () => {
    expect(PRICES).toMatchObject({ "polera-essential": 19990, "chino-everyday": 39990, "polo-classic": 29990, "camisa-oxford": 34990, "frma-01": 179990 });
    const separate = capsulePieces().reduce((s, p) => s + PRICES[p.productId], 0);
    expect(separate).toBe(204930);
    expect(separate).toBeGreaterThan(PRICES["frma-01"]);
  });

  it("formatea CLP", () => {
    expect(formatCLP(19990)).toBe("$19.990");
    expect(formatCLP(179990)).toBe("$179.990");
  });
});

describe("carrito", () => {
  const tee = { id: "polera-essential" as const, kind: "product" as const, colorId: "blanco", size: "M", quantity: 1 };

  it("agrega, agrupa líneas iguales y separa variantes", () => {
    let lines = addLine([], tee);
    lines = addLine(lines, tee);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(2);
    lines = addLine(lines, { ...tee, size: "L" });
    expect(lines).toHaveLength(2);
    expect(count(lines)).toBe(3);
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

  it("calcula subtotal", () => {
    let lines = addLine([], { ...tee, quantity: 2 });
    lines = addLine(lines, { id: "frma-01", kind: "capsule", topSize: "M", bottomSize: "42", quantity: 1 });
    expect(subtotal(lines, (id) => PRICES[id])).toBe(2 * 19990 + 179990);
  });

  it("descarta líneas inválidas guardadas en el navegador", () => {
    const bad = [{ id: "inexistente", quantity: 1 }, { ...tee, colorId: "rojo", key: "x" }, { ...tee, key: "ok" }, null, "x"];
    expect(sanitize(bad)).toHaveLength(1);
    expect(sanitize("basura")).toEqual([]);
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
    expect(pickVariant(exp, 0.1).id).toBe("a");
    expect(pickVariant(exp, 0.9).id).toBe("b");
  });

  it("resuelve precio por variante sin afectar otros productos", () => {
    expect(resolvePrice("frma-01", { test: "b" }, [exp])).toBe(159990);
    expect(resolvePrice("frma-01", { test: "a" }, [exp])).toBe(179990);
    expect(resolvePrice("polera-essential", { test: "b" }, [exp])).toBe(19990);
  });

  it("genera experiment_id y variant_id para eventos", () => {
    expect(experimentParams({})).toEqual({});
    expect(experimentParams({ test: "b" })).toEqual({ experiment_id: "test", variant_id: "b" });
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
