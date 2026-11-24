/**
 * PRECIOS PROVISIONALES DEL CATÁLOGO INICIAL
 * ---------------------------------------------------------------
 * Desde la versión 2 los precios se editan en /admin (Productos y
 * Guardarropas). Estos valores solo se usan al importar el catálogo inicial
 * o si Supabase no está configurado.
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


