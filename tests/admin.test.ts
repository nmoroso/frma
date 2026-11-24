import { describe, expect, it } from "vitest";
import { cleanHref, isHomeSection, storagePathFor, STORAGE_PATH_RE, uniqueSlug, validateCollection, validateProduct, validateUpload } from "@/lib/admin/validate";

const uuid = "3f1c2a8e-1b2c-4d5e-8f90-1234567890ab";
const base = {
  id: "polera-essential",
  name: "Polera Essential",
  category: "poleras",
  tagline: "",
  description: "",
  price: 19990,
  material: "",
  fit: "",
  care: "",
  sizes: ["S", "M"],
  status: "draft",
  sortOrder: 10,
  variants: [
    { id: null, slug: "", name: "Blanco", hex: "#ffffff", sku: "pe-bla", sizes: null, price: null, active: true, mediaIds: [uuid, uuid, "no-uuid"] },
    { id: null, slug: "", name: "Azul marino", hex: "#202C40", sku: "PE-AZU", sizes: ["M"], price: 21990, active: true, mediaIds: [] },
  ],
};

describe("validación de productos del panel", () => {
  it("normaliza HEX y SKU, genera slugs y limpia fotos", () => {
    const r = validateProduct(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [w, n] = r.value.variants;
    expect(w).toMatchObject({ hex: "#FFFFFF", sku: "PE-BLA", slug: "blanco", sizes: null, mediaIds: [uuid] });
    expect(n).toMatchObject({ slug: "azul-marino", sizes: ["M"], price: 21990 });
  });
  it("rechaza HEX inválido, SKU repetido y categoría desconocida", () => {
    const bad = (patch: object) => validateProduct({ ...base, ...patch });
    expect(bad({ variants: [{ ...base.variants[0], hex: "azul" }] })).toMatchObject({ ok: false });
    expect(bad({ variants: [base.variants[0], { ...base.variants[1], sku: "pe-bla" }] })).toMatchObject({ ok: false, error: expect.stringContaining("repetido") });
    expect(bad({ category: "zapatos" })).toMatchObject({ ok: false });
    expect(bad({ price: -5 })).toMatchObject({ ok: false });
  });
  it("para publicar exige precio, un color activo y tallas", () => {
    expect(validateProduct({ ...base, status: "published", price: 0 })).toMatchObject({ ok: false });
    expect(validateProduct({ ...base, status: "published", variants: base.variants.map((v) => ({ ...v, active: false })) })).toMatchObject({ ok: false });
    expect(validateProduct({ ...base, status: "published", sizes: [], variants: [base.variants[0]] })).toMatchObject({ ok: false });
    expect(validateProduct({ ...base, status: "published" })).toMatchObject({ ok: true });
  });
  it("slug único entre colores", () => {
    const taken = new Set(["azul"]);
    expect(uniqueSlug("Azul", taken)).toBe("azul-2");
    expect(uniqueSlug("Azul", taken)).toBe("azul-3");
  });
});

describe("validación de guardarropas", () => {
  it("limpia piezas y exige datos para publicar", () => {
    const r = validateCollection({ id: "frma-01", name: "FRMA 01", price: 179990, status: "published", topSizes: ["M"], bottomSizes: ["42"], pieces: [{ variantId: uuid, role: "bottom" }, { variantId: "x" }], mediaIds: [] });
    expect(r).toMatchObject({ ok: true, value: { pieces: [{ variantId: uuid, role: "bottom" }] } });
    expect(validateCollection({ name: "X", price: 1000, status: "published", pieces: [] })).toMatchObject({ ok: false });
  });
});

describe("fotos", () => {
  it("solo acepta imágenes permitidas de hasta 8 MB", () => {
    expect(validateUpload({ name: "a.webp", type: "image/webp", size: 500_000 })).toBeNull();
    expect(validateUpload({ name: "a.gif", type: "image/gif", size: 500 })).toMatch(/formato/);
    expect(validateUpload({ name: "a.svg", type: "image/svg+xml", size: 500 })).toMatch(/formato/);
    expect(validateUpload({ name: "a.jpg", type: "image/jpeg", size: 9 * 1024 * 1024 })).toMatch(/8 MB/);
  });
  it("rutas de almacenamiento predecibles y validables", () => {
    const p = storagePathFor("image/webp", new Date("2026-11-24T00:00:00Z"), uuid);
    expect(p).toBe(`2026/11/${uuid}.webp`);
    expect(STORAGE_PATH_RE.test(p)).toBe(true);
    expect(STORAGE_PATH_RE.test("../secreto.webp")).toBe(false);
  });
});

describe("página principal", () => {
  it("secciones y enlaces seguros", () => {
    expect(isHomeSection("hero")).toBe(true);
    expect(isHomeSection("category:poleras")).toBe(true);
    expect(isHomeSection("category:otra")).toBe(false);
    expect(cleanHref("/frma-01")).toBe("/frma-01");
    expect(cleanHref("https://instagram.com/frma")).toBe("https://instagram.com/frma");
    expect(cleanHref("javascript:alert(1)")).toBeNull();
    expect(cleanHref("//evil.com")).toBeNull();
    expect(cleanHref("")).toBe("");
  });
});
