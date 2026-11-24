/**
 * Textos de la página de inicio.
 * Las IMÁGENES del inicio (portada, banners, categorías, editorial, destacados)
 * se administran en /admin → Página principal. `hero.image` solo se usa si
 * Supabase no está configurado.
 */
type LocalImage = { src: string; alt: string; conceptual?: boolean };

export const HOME: {
  hero: { eyebrow: string; title: string; subtitle: string; cta: string; secondaryCta: string; image?: LocalImage };
  benefits: { title: string; text: string }[];
  manifesto: { title: string; text: string };
} = {
  hero: {
    eyebrow: "Nueva marca · Chile",
    title: "Tu ropero, resuelto",
    subtitle: "Prendas esenciales que combinan entre sí. Menos decisiones, mejor estilo, todos los días.",
    cta: "Descubre FRMA 01",
    secondaryCta: "Ver catálogo",
    image: undefined,
  },
  benefits: [
    { title: "Todo combina", text: "Paleta neutra pensada para que cualquier prenda funcione con las demás." },
    { title: "Atemporal", text: "Diseños simples que no pasan de moda. Compras menos y mejor." },
    { title: "Sin complicaciones", text: "Calces claros y una selección corta. Eliges en minutos." },
    { title: "Hecho para Chile", text: "Precios en pesos chilenos y despacho a todo el país (por confirmar)." },
  ],
  manifesto: {
    title: "Vestir bien no debería ser complicado.",
    text: "FRMA nace para hombres que quieren verse bien sin pensar cada mañana qué ponerse. Seleccionamos pocas prendas, en colores que conversan entre sí, para que tu ropero funcione como un sistema.",
  },
};
