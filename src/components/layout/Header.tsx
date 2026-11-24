"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SITE } from "@/config/site";
import { count } from "@/lib/cart/cart";
import { useCart, useCartReady } from "@/lib/hooks";

const NAV = [
  { href: "/frma-01", label: "FRMA 01" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/catalogo?categoria=poleras", label: "Poleras" },
  { href: "/catalogo?categoria=pantalones", label: "Pantalones" },
  { href: "/catalogo?categoria=camisas", label: "Camisas y polos" },
];

export function Header(props: { static?: boolean }) {
  if (props.static) return <StoreHeader pathname={null} />;
  return <RoutedHeader />;
}

function RoutedHeader() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return <AdminHeader />;
  return <StoreHeader pathname={pathname} />;
}

function StoreHeader({ pathname }: { pathname: string | null }) {
  // El menú queda abierto solo para la ruta en que se abrió (se cierra al navegar).
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor !== null && openFor === pathname;
  const lines = useCart();
  const ready = useCartReady();
  const n = count(lines);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      {SITE.announcement && (
        <div className="bg-ink py-2 text-center text-[11px] tracking-[0.14em] text-paper uppercase">
          {SITE.announcement}
        </div>
      )}
      <div className="container-frma flex h-14 items-center justify-between sm:h-16">
        <div className="flex items-center gap-3 lg:hidden">
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            className="-ml-2 p-2"
            onClick={() => setOpenFor(open ? null : pathname)}
          >
            <span className="block h-px w-5 bg-ink" />
            <span className={`mt-1.5 block h-px w-5 bg-ink transition-opacity ${open ? "opacity-0" : ""}`} />
            <span className="mt-1.5 block h-px w-5 bg-ink" />
          </button>
        </div>
        <Link href="/" className="text-lg font-semibold tracking-[0.42em] lg:text-xl" aria-label="FRMA, inicio">
          FRMA
        </Link>
        <nav aria-label="Principal" className="hidden flex-1 justify-center gap-8 text-[13px] tracking-wide lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="py-2 text-ink/80 hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/carrito" className="relative -mr-2 flex items-center gap-2 p-2 text-[13px]" aria-label={`Carrito, ${n} productos`}>
          <BagIcon />
          <span className="hidden sm:inline">Carrito</span>
          {ready && n > 0 && (
            <span className="absolute -right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] text-paper sm:static sm:h-5 sm:min-w-5">
              {n}
            </span>
          )}
        </Link>
      </div>
      {open && (
        <nav aria-label="Menú móvil" className="border-t border-line bg-paper lg:hidden">
          <ul className="container-frma py-4">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block py-3 text-lg font-light" onClick={() => setOpenFor(null)}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

function AdminHeader() {
  return (
    <header className="border-b border-line bg-paper">
      <div className="container-frma flex h-14 items-center justify-between">
        <Link href="/" className="font-semibold tracking-[0.42em]">FRMA</Link>
        <span className="eyebrow">Panel del experimento</span>
      </div>
    </header>
  );
}

function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <path d="M5 8h14l-1 13H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
