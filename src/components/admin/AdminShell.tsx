"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { LogoutButton } from "@/app/admin/login/LoginForm";
import { ConfirmHost, Toaster } from "./ui";

const NAV = [
  { href: "/admin", label: "Resumen", exact: true },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/modelos", label: "Modelos" },
  { href: "/admin/imagenes", label: "Biblioteca de imágenes" },
  { href: "/admin/colecciones", label: "Guardarropas y colecciones" },
  { href: "/admin/inicio", label: "Imágenes de la página principal" },
  { href: "/admin/experiment", label: "Resultados del smoke test" },
];

function NavLinks({ pathname }: { pathname: string }) {
  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <>
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={active(n.href, n.exact) ? "page" : undefined}
          className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm transition-colors ${active(n.href, n.exact) ? "bg-ink text-paper" : "text-ink/75 hover:bg-stone hover:text-ink"}`}
        >
          {n.label}
        </Link>
      ))}
    </>
  );
}

function RoutedNav() {
  return <NavLinks pathname={usePathname() ?? ""} />;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-ivory/60 lg:flex">
      <aside className="border-b border-line bg-paper lg:sticky lg:top-0 lg:h-[calc(100vh-3.5rem)] lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <nav aria-label="Panel de administración" className="flex gap-1 overflow-x-auto px-3 py-2 lg:flex-col lg:px-4 lg:py-6">
          <Suspense fallback={<NavLinks pathname="" />}>
            <RoutedNav />
          </Suspense>
        </nav>
        <div className="hidden border-t border-line px-4 py-4 lg:block">
          <Link href="/" target="_blank" className="block px-3 py-2 text-sm text-muted hover:text-ink">Ver tienda ↗</Link>
          <LogoutButton />
        </div>
      </aside>
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      <Toaster />
      <ConfirmHost />
    </div>
  );
}

/** Título de cada página del panel. */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-light tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
