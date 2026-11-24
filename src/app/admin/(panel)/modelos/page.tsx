import { PanelGate } from "@/components/admin/PanelGate";
import { loadModels } from "@/lib/admin/data";
import { ModelsManager } from "./ModelsManager";

export default function ModelsPage() {
  return <PanelGate>{async () => <ModelsManager models={await loadModels()} />}</PanelGate>;
}
