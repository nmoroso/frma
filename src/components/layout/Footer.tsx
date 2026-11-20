import Link from "next/link";
import { SITE } from "@/config/site";
import { CookiePreferencesButton } from "@/components/analytics/ConsentBanner";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-ivory">
      <div className="container-frma grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-semibold tracking-[0.42em]">FRMA</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            {SITE.tagline}. Prendas atemporales y combinables para hombres que prefieren vestir bien sin pensarlo demasiado.
          </p>
        </div>
        <FooterCol
          title="Tienda"
          links={[
            { href: "/frma-01", label: "FRMA 01" },
            { href: "/catalogo", label: "Catálogo" },
            { href: "/carrito", label: "Carrito" },
          ]}
        />
        <FooterCol
          title="FRMA"
          links={[
            { href: "/prelanzamiento", label: "Lanzamiento" },
            { href: "/contacto", label: "Contacto" },
            { href: "/privacidad", label: "Privacidad y cookies" },
          ]}
        />
        <div>
          <p className="eyebrow">Ayuda</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a className="link-underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
            </li>
            <li>
              <CookiePreferencesButton className="link-underline text-left" />
            </li>
          </ul>
        </div>
      </div>
      <div className="container-frma flex flex-col gap-2 border-t border-line py-6 text-xs text-muted sm:flex-row sm:justify-between">
        <p>© FRMA (marca provisional) · Chile</p>
        <p>Sitio en prelanzamiento: aún no recibimos pedidos ni pagos.</p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="link-underline">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
