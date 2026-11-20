import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/config/site";

export const metadata: Metadata = { title: "Contacto" };

export default function ContactPage() {
  return (
    <div className="container-frma max-w-3xl py-14 sm:py-20">
      <p className="eyebrow">Contacto</p>
      <h1 className="h2 mt-2">Hablemos</h1>
      <p className="mt-6 leading-relaxed text-ink/80">
        ¿Preguntas, ideas o comentarios sobre FRMA? Escríbenos y te respondemos a la brevedad.
      </p>
      <dl className="mt-10 divide-y divide-line border-y border-line text-sm">
        <div className="flex justify-between gap-4 py-4">
          <dt className="text-muted">Correo</dt>
          <dd><a className="link-underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a></dd>
        </div>
        {SITE.instagram && (
          <div className="flex justify-between gap-4 py-4">
            <dt className="text-muted">Instagram</dt>
            <dd><a className="link-underline" href={SITE.instagram} target="_blank" rel="noopener noreferrer">{SITE.instagram.replace(/^https?:\/\/(www\.)?/, "")}</a></dd>
          </div>
        )}
        <div className="flex justify-between gap-4 py-4">
          <dt className="text-muted">Estado</dt>
          <dd>Prelanzamiento: aún no recibimos pedidos ni pagos.</dd>
        </div>
      </dl>
      <p className="mt-8 text-sm text-muted">
        Para ejercer tus derechos sobre tus datos personales revisa nuestra{" "}
        <Link href="/privacidad" className="link-underline">política de privacidad</Link>.
      </p>
    </div>
  );
}
