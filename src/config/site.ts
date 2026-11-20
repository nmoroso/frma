/**
 * Configuración general del sitio. Textos editables sin tocar componentes.
 */
export const SITE = {
  name: "FRMA",
  tagline: "Tu ropero, resuelto",
  description:
    "Vestuario masculino minimalista: prendas atemporales y combinables, y guardarropas cápsula seleccionados. Hecho para Chile.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  locale: "es-CL",
  currency: "CLP" as const,
  /** PENDIENTE: reemplaza por un correo real de la marca antes de lanzar. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hola@ejemplo.cl",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "",
  /** Barra superior. Déjala vacía ("") para ocultarla. */
  announcement: "Prelanzamiento · Muy pronto en Chile",
  shipping: {
    /** Texto mostrado en checkout. Mantener "por confirmar" hasta tener operador logístico. */
    estimate: "Por confirmar",
    note: "Los plazos y costos de despacho aún no están definidos. Te los informaremos antes del lanzamiento.",
  },
  /** Versión del texto de consentimiento guardado junto a cada lead. Súbela si cambias el texto. */
  leadConsentVersion: "2026-11-v1",
  leadConsentText:
    "Acepto que FRMA guarde mi correo para avisarme del lanzamiento y enviarme novedades. Puedo darme de baja cuando quiera.",
};
