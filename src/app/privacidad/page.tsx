import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { CookiePreferencesButton } from "@/components/analytics/ConsentBanner";

export const metadata: Metadata = { title: "Privacidad y cookies" };

/**
 * TEXTO BASE — PENDIENTE DE REVISIÓN LEGAL (ver docs/PENDIENTES-LANZAMIENTO.md).
 */
export default function PrivacyPage() {
  return (
    <article className="container-frma max-w-3xl py-14 sm:py-20">
      <p className="eyebrow">Legal</p>
      <h1 className="h2 mt-2">Política de privacidad y cookies</h1>
      <p className="mt-3 text-sm text-muted">Versión preliminar · noviembre 2026 · sujeta a revisión legal.</p>

      <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink/85 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-medium [&_h2]:text-ink">
        <section>
          <h2>Quiénes somos</h2>
          <p>
            FRMA es un proyecto de marca de vestuario en etapa de prelanzamiento en Chile. Durante esta etapa{" "}
            <strong>no vendemos productos, no recibimos pedidos ni procesamos pagos</strong>. El responsable del
            tratamiento de datos es: <em>[nombre o razón social y RUT — pendiente]</em>. Contacto:{" "}
            <a className="link-underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
          </p>
        </section>
        <section>
          <h2>Qué datos recogemos</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Si te registras voluntariamente:</strong> tu correo electrónico, el producto que te interesa, la fecha,
              la versión del texto de consentimiento que aceptaste y la campaña publicitaria por la que llegaste (parámetros UTM).
            </li>
            <li>
              <strong>Datos de navegación anónimos</strong> (solo si aceptas cookies de analítica): páginas visitadas, productos
              vistos, productos agregados al carrito y un identificador aleatorio de sesión. No incluyen tu nombre ni tu correo.
            </li>
          </ul>
          <p className="mt-2">No pedimos datos de tarjetas, RUT, dirección ni teléfono.</p>
        </section>
        <section>
          <h2>Para qué los usamos</h2>
          <p>
            Para avisarte del lanzamiento y enviarte novedades de FRMA (si lo autorizaste), y para medir el interés en nuestros
            productos y la efectividad de nuestros anuncios. No vendemos tus datos.
          </p>
        </section>
        <section>
          <h2>Dónde se guardan</h2>
          <p>
            Los registros se almacenan en Supabase (proveedor de base de datos) y el sitio se aloja en Vercel. Las herramientas
            de medición son Google Analytics 4, Microsoft Clarity y Meta Pixel. Estos proveedores pueden procesar datos fuera de
            Chile. <em>[Detalle de ubicación de servidores y transferencias internacionales — pendiente de revisión legal]</em>.
          </p>
        </section>
        <section id="cookies">
          <h2>Cookies</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Necesarias</strong> (siempre activas): carrito, preferencias de cookies y origen de la visita, guardados en tu navegador.</li>
            <li><strong>Analítica</strong> (opcional): Google Analytics 4, Microsoft Clarity (incluye mapas de calor y grabaciones anónimas de sesión) y nuestra medición propia.</li>
            <li><strong>Publicidad</strong> (opcional): Meta Pixel, para medir anuncios de Instagram y Facebook.</li>
          </ul>
          <p className="mt-2">
            Las cookies opcionales no se activan hasta que las aceptas. Puedes cambiar tu decisión cuando quieras:{" "}
            <CookiePreferencesButton className="link-underline" />.
          </p>
        </section>
        <section>
          <h2>Tus derechos</h2>
          <p>
            Puedes solicitar acceso, rectificación, eliminación u oposición al uso de tus datos, y retirar tu consentimiento,
            escribiendo a <a className="link-underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>. Cada correo
            que te enviemos incluirá una forma de darte de baja.
          </p>
        </section>
        <section>
          <h2>Cuánto tiempo</h2>
          <p>
            Conservamos tu correo hasta que te des de baja o hasta 12 meses después del fin del prelanzamiento si no lanzamos.{" "}
            <em>[Plazo pendiente de confirmar]</em>.
          </p>
        </section>
      </div>
    </article>
  );
}
