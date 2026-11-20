/** Configuración pública de Supabase (URL + clave anon/publishable). Segura en el navegador. */
export function supabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && anonKey ? { url, anonKey } : null;
}
