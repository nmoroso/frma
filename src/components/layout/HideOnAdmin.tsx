"use client";

import { usePathname } from "next/navigation";

/** Oculta su contenido dentro del panel de administración. */
export function HideOnAdmin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
