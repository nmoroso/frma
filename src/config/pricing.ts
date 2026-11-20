/**
 * PRECIOS PROVISIONALES — EDITA AQUÍ ANTES DE LANZAR PUBLICIDAD
 * ---------------------------------------------------------------
 * Todos los precios del sitio salen de este archivo (en CLP, sin puntos).
 * Son HIPÓTESIS de trabajo: NO están validados contra proveedores, costos
 * de importación, despacho ni márgenes.
 *
 * Cuando los valides, cambia `PRICES_VALIDATED` a `true` y anota la fecha.
 * Mientras sea `false`, el README y el checklist de QA te recordarán
 * revisarlos antes de invertir en anuncios.
 */

export const PRICES_VALIDATED = false;
export const PRICES_LAST_REVIEW = "pendiente";

/** Precio por familia de producto (clave = id de la familia en catalog.ts). */
export const PRICES = {
  "polera-essential": 19990,
  "chino-everyday": 39990,
  "polo-classic": 29990,
  "camisa-oxford": 34990,
  "frma-01": 179990,
} as const satisfies Record<string, number>;

export type PricedId = keyof typeof PRICES;
