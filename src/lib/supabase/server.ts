import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublicConfig } from "./public";

/** Lista de correos autorizados para el panel (variable ADMIN_EMAILS, separada por comas). */
export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Devuelve el usuario administrador autenticado (Supabase Auth) o null.
 * Usa auth.getUser(), que valida el token contra Supabase (no confía solo en la cookie).
 */
export async function getAdminUser(): Promise<{ email: string } | null> {
  const cfg = supabasePublicConfig();
  if (!cfg) return null;
  const store = await cookies();
  const supabase = createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* En Server Components no se pueden escribir cookies; el proxy las renueva. */
        }
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (error || !email) return null;
  return adminEmails().includes(email) ? { email } : null;
}
