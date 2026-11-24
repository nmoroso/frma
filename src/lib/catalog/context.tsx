"use client";

import { createContext, useContext } from "react";
import type { Catalog } from "./types";

const CatalogContext = createContext<Catalog | null>(null);

/** Entrega el catálogo (cargado en el servidor) a los componentes del navegador. */
export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: React.ReactNode }) {
  return <CatalogContext value={catalog}>{children}</CatalogContext>;
}

export function useCatalog(): Catalog {
  const c = useContext(CatalogContext);
  if (!c) throw new Error("useCatalog debe usarse dentro de <CatalogProvider>");
  return c;
}
