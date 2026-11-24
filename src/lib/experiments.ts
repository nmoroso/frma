import { ACTIVE_EXPERIMENTS, type Experiment, type Variant } from "@/config/experiments";
import { readJSON, writeJSON } from "./storage";

const KEY = "frma_exp";

type Assignments = Record<string, string>;

/** Elige variante según pesos. `rand` en [0,1). Exportada para tests. */
export function pickVariant(exp: Experiment, rand: number): Variant {
  const total = exp.variants.reduce((s, v) => s + Math.max(0, v.weight), 0) || 1;
  let acc = 0;
  for (const v of exp.variants) {
    acc += Math.max(0, v.weight) / total;
    if (rand < acc) return v;
  }
  return exp.variants[exp.variants.length - 1];
}

let memo: Assignments | null = null;

/**
 * Devuelve (y persiste) la variante de cada experimento activo.
 * Solo corre en el navegador. Una vez asignada, la variante no cambia.
 */
export function getAssignments(experiments: Experiment[] = ACTIVE_EXPERIMENTS): Assignments {
  if (typeof window === "undefined") return {};
  if (memo) return memo;
  const stored = readJSON<Assignments>(KEY, {});
  const result: Assignments = {};
  for (const exp of experiments) {
    const existing = stored[exp.id];
    const valid = exp.variants.some((v) => v.id === existing);
    result[exp.id] = valid ? existing : pickVariant(exp, Math.random()).id;
  }
  writeJSON(KEY, result);
  memo = result;
  return result;
}

export function getVariant(exp: Experiment, assignments: Assignments): Variant | undefined {
  return exp.variants.find((v) => v.id === assignments[exp.id]);
}

/** Precio final considerando experimentos de precio activos. */
export function resolvePrice(
  id: string,
  base: number,
  assignments: Assignments,
  experiments: Experiment[] = ACTIVE_EXPERIMENTS,
): number {
  for (const exp of experiments) {
    if (exp.type !== "price") continue;
    const override = getVariant(exp, assignments)?.prices?.[id];
    if (typeof override === "number") return override;
  }
  return base;
}

/** Parámetros para adjuntar a cada evento de analítica. */
export function experimentParams(assignments: Assignments): Record<string, string> {
  const ids = Object.keys(assignments);
  if (ids.length === 0) return {};
  const variants = ids.map((id) => assignments[id]).join(",");
  return {
    experiment_id: ids.join(","),
    variant_id: variants,
    // Copia sin ambigüedad: en select_color, variant_id es el SKU del color.
    experiment_variant_id: variants,
  };
}
