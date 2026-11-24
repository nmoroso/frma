"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { MediaItem } from "@/lib/admin/data";
import type { Product } from "@/lib/catalog/types";

type Ctx = {
  library: MediaItem[];
  byId: Map<string, MediaItem>;
  addMedia: (items: MediaItem[]) => void;
  updateMediaLocal: (id: string, patch: Partial<MediaItem>) => void;
  removeMediaLocal: (ids: string[]) => void;
  products: Product[];
};

const AdminDataContext = createContext<Ctx | null>(null);

/** Biblioteca de fotos y productos disponibles en las páginas del panel. */
export function AdminDataProvider({ library, products, children }: { library: MediaItem[]; products: Product[]; children: React.ReactNode }) {
  const [items, setItems] = useState(library);
  const addMedia = useCallback((n: MediaItem[]) => setItems((prev) => [...n, ...prev.filter((p) => !n.some((x) => x.id === p.id))]), []);
  const updateMediaLocal = useCallback((id: string, patch: Partial<MediaItem>) => setItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m))), []);
  const removeMediaLocal = useCallback((ids: string[]) => setItems((prev) => prev.filter((m) => !ids.includes(m.id))), []);
  const byId = useMemo(() => new Map(items.map((m) => [m.id, m])), [items]);
  return (
    <AdminDataContext value={{ library: items, byId, addMedia, updateMediaLocal, removeMediaLocal, products }}>
      {children}
    </AdminDataContext>
  );
}

export function useAdminData() {
  const c = useContext(AdminDataContext);
  if (!c) throw new Error("useAdminData requiere <AdminDataProvider>");
  return c;
}
