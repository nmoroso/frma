import { PanelGate } from "@/components/admin/PanelGate";
import { MediaLibrary } from "./MediaLibrary";

export default function MediaPage() {
  return <PanelGate>{() => <MediaLibrary />}</PanelGate>;
}
