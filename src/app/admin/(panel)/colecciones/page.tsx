import { PanelGate } from "@/components/admin/PanelGate";
import { CollectionsList } from "./CollectionsList";

export default function CollectionsPage() {
  return <PanelGate>{({ catalog }) => <CollectionsList collections={catalog.collections} />}</PanelGate>;
}
