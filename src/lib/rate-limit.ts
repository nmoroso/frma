/**
 * Límite de peticiones en memoria (mejor esfuerzo).
 * En Vercel cada instancia tiene su propia memoria, así que es una barrera
 * básica, no absoluta. La base de datos además impide correos duplicados.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

export function clientKey(req: Request) {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Rechaza peticiones de otros sitios (CSRF básico). */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // sendBeacon de algunos navegadores no envía Origin
  try {
    return new URL(origin).host === new URL(req.url).host || new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
