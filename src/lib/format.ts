const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

/** 19990 → "$19.990" */
export function formatCLP(value: number): string {
  return clp.format(Math.round(value)).replace(/\s/g, "");
}
