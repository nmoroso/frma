"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { importSeedCatalog } from "../actions";
import { Spinner, toast } from "@/components/admin/ui";

export function ImportSeedButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn-primary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await importSeedCatalog();
        setBusy(false);
        if (!r.ok) return toast("error", r.error);
        toast("ok", `Catálogo importado: ${r.data.products} productos y ${r.data.variants} colores.`);
        router.refresh();
      }}
    >
      {busy ? <><Spinner className="mr-2" /> Importando…</> : "Importar catálogo inicial"}
    </button>
  );
}
