import { notFound } from "next/navigation";
import { PanelGate } from "@/components/admin/PanelGate";
import { CollectionEditor } from "./CollectionEditor";

export default function EditCollectionPage({ params }: PageProps<"/admin/colecciones/[id]">) {
  return (
    <PanelGate>
      {async ({ catalog }) => {
        const { id } = await params;
        const c = catalog.collections.find((x) => x.id === id);
        if (!c) notFound();
        const pieces = c.pieces.flatMap((p) => {
          const v = catalog.products.find((x) => x.id === p.productId)?.variants.find((x) => x.slug === p.variantSlug);
          return v ? [{ variantId: v.id, role: p.role }] : [];
        });
        return <CollectionEditor key={JSON.stringify(c).length + c.pieces.length} collection={c} pieces={pieces} />;
      }}
    </PanelGate>
  );
}
