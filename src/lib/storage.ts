/** Acceso seguro a localStorage/sessionStorage (modo incógnito, bloqueos, SSR). */
type Kind = "local" | "session";

function store(kind: Kind): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readJSON<T>(key: string, fallback: T, kind: Kind = "local"): T {
  try {
    const raw = store(kind)?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown, kind: Kind = "local") {
  try {
    store(kind)?.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible: seguimos en memoria */
  }
}

export function removeKey(key: string, kind: Kind = "local") {
  try {
    store(kind)?.removeItem(key);
  } catch {
    /* noop */
  }
}

export function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** Pequeño store reactivo para useSyncExternalStore. */
export function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(next: T) {
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
