import { Suspense } from "react";
import { loadAdminCatalog, loadMediaLibrary, type MediaItem } from "@/lib/admin/data";
import type { Catalog } from "@/lib/catalog/types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminPage } from "@/lib/supabase/server";
import { AdminDataProvider } from "./AdminData";

/**
 * Envoltorio de cada página del panel:
 *  - exige sesión de administrador (si no, va a /admin/login),
 *  - explica qué falta si Supabase no está configurado o falta el esquema,
 *  - carga la biblioteca de fotos y los productos.
 */
export function PanelGate({ children }: { children: (data: { catalog: Catalog; library: MediaItem[] }) => React.ReactNode | Promise<React.ReactNode> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
      <Inner>{children}</Inner>
    </Suspense>
  );
}

async function Inner({ children }: { children: (data: { catalog: Catalog; library: MediaItem[] }) => React.ReactNode | Promise<React.ReactNode> }) {
  await requireAdminPage();
  if (!supabaseAdmin()) {
    return <Problem title="Falta configurar Supabase">Agrega <code>SUPABASE_SERVICE_ROLE_KEY</code> en las variables de entorno (ver README → Supabase).</Problem>;
  }
  let catalog: Catalog;
  let library: MediaItem[];
  try {
    [catalog, library] = await Promise.all([loadAdminCatalog(), loadMediaLibrary()]);
  } catch (e) {
    return (
      <Problem title="Falta actualizar la base de datos">
        Ejecuta el archivo <code>supabase/schema.sql</code> en Supabase → SQL Editor (es seguro ejecutarlo de nuevo).
        <span className="mt-2 block text-xs text-muted">Detalle técnico: {(e as Error).message}</span>
      </Problem>
    );
  }
  return (
    <AdminDataProvider library={library} products={catalog.products}>
      {await children({ catalog, library })}
    </AdminDataProvider>
  );
}

function Problem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-xl border border-line bg-paper p-6">
      <h1 className="text-lg font-medium">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed">{children}</p>
    </div>
  );
}
