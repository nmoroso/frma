/**
 * EXPERIMENTOS A/B — desactivados por defecto
 * ---------------------------------------------------------------
 * Para activar uno:
 *   1. Cambia `enabled: false` a `true` en UN experimento.
 *   2. Ajusta variantes y pesos (los pesos se normalizan, 50/50 = mitad y mitad).
 *   3. Despliega. Cada visitante recibe una variante y la conserva en su
 *      navegador (no verá precios distintos mientras navega).
 *
 * Recomendación: activa un solo experimento a la vez y no lo cambies una vez
 * iniciado (si cambias variantes, cambia también el `id`, p. ej. "precio-capsula-v2").
 *
 * Todos los eventos de analítica incluyen `experiment_id` y `variant_id`.
 */
export type Variant = {
  id: string;
  weight: number;
  /**
   * Sobrescribe precios para esta variante (solo experimentos de tipo "price").
   * Clave = id del producto o del guardarropa (ver /admin, p. ej. "frma-01").
   */
  prices?: Record<string, number>;
  /** Sobrescribe textos del hero (solo experimentos de tipo "message"). */
  hero?: { title?: string; subtitle?: string };
};

export type Experiment = {
  id: string;
  enabled: boolean;
  type: "price" | "message";
  description: string;
  variants: Variant[];
};

export const EXPERIMENTS: Experiment[] = [
  {
    id: "precio-frma01-v1",
    enabled: false,
    type: "price",
    description: "¿Cambia la intención de compra de FRMA 01 a $159.990 vs $179.990?",
    variants: [
      { id: "control", weight: 50 },
      { id: "precio-bajo", weight: 50, prices: { "frma-01": 159990 } },
    ],
  },
  {
    id: "mensaje-hero-v1",
    enabled: false,
    type: "message",
    description: "Mensaje principal: simplicidad vs ahorro de tiempo.",
    variants: [
      { id: "control", weight: 50 },
      {
        id: "tiempo",
        weight: 50,
        hero: {
          title: "Vístete bien en 30 segundos",
          subtitle: "Siete prendas que combinan entre sí. Menos decisiones cada mañana.",
        },
      },
    ],
  },
];

export const ACTIVE_EXPERIMENTS = EXPERIMENTS.filter(
  (e) => e.enabled && e.variants.length > 1,
);
export const HAS_PRICE_EXPERIMENT = ACTIVE_EXPERIMENTS.some((e) => e.type === "price");
export const HAS_MESSAGE_EXPERIMENT = ACTIVE_EXPERIMENTS.some((e) => e.type === "message");
