import { CATEGORIES } from "@/config/catalog";
import { PanelGate } from "@/components/admin/PanelGate";
import { loadHomeRows } from "@/lib/admin/data";
import { HomeImagesEditor, type SectionDef } from "./HomeImagesEditor";

export default function HomeImagesPage() {
  return (
    <PanelGate>
      {async ({ catalog }) => {
        const rows = await loadHomeRows();
        const used = new Set(catalog.products.map((p) => p.category));
        const sections: SectionDef[] = [
          { key: "hero", title: "Imagen principal de portada", description: "La foto grande junto al mensaje «Tu ropero, resuelto». Ideal vertical (4:5) o apaisada en computador.", single: true, kind: "editorial" },
          { key: "banner", title: "Banners", description: "Fotos a todo el ancho con título y enlace opcionales. Aparecen después de la propuesta de valor.", texts: true, link: true, kind: "editorial" },
          { key: "wardrobe", title: "Foto del guardarropa destacado", description: "Se muestra en el bloque de FRMA 01 del inicio. Si no eliges una, se usa la foto principal del guardarropa o una composición.", single: true, kind: "outfit" },
          ...CATEGORIES.filter((c) => used.has(c.id)).map((c) => ({
            key: `category:${c.id}`,
            title: `Categoría: ${c.name}`,
            description: "Imagen del acceso a la categoría. Si no eliges una, se usa la foto principal del primer producto.",
            single: true,
            kind: "producto" as const,
          })),
          { key: "editorial", title: "Imágenes editoriales", description: "Fotos de campaña con texto opcional (máximo 4 se muestran).", texts: true, kind: "editorial" },
          { key: "featured", title: "Fotografías destacadas", description: "Grilla de fotos con título y enlace opcional (máximo 8 se muestran).", texts: true, link: true, kind: "outfit" },
        ];
        const initial = Object.fromEntries(
          sections.map((s) => [
            s.key,
            rows.filter((r) => r.section === s.key).map((r) => ({ mediaId: r.media_id, title: r.title, subtitle: r.subtitle, href: r.href })),
          ]),
        );
        return <HomeImagesEditor sections={sections} initial={initial} />;
      }}
    </PanelGate>
  );
}
