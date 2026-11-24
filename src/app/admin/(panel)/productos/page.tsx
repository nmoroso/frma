import { PanelGate } from "@/components/admin/PanelGate";
import { ProductsList } from "./ProductsList";

export default function ProductsPage() {
  return <PanelGate>{({ catalog }) => <ProductsList products={catalog.products} />}</PanelGate>;
}
