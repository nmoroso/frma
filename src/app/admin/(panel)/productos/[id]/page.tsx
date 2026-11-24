import { notFound } from "next/navigation";
import { PanelGate } from "@/components/admin/PanelGate";
import { ProductEditor } from "./ProductEditor";

export default function EditProductPage({ params }: PageProps<"/admin/productos/[id]">) {
  return (
    <PanelGate>
      {async ({ catalog }) => {
        const { id } = await params;
        const product = catalog.products.find((p) => p.id === id);
        if (!product) notFound();
        return <ProductEditor key={signature(product)} product={product} />;
      }}
    </PanelGate>
  );
}

/** Cambia cuando los datos guardados cambian: así el editor se recarga tras guardar. */
function signature(value: unknown) {
  const s = JSON.stringify(value);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return String(h);
}
