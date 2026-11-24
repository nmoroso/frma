import "server-only";
import { PostgrestClient } from "@supabase/postgrest-js";
import { StorageClient } from "@supabase/storage-js";

/**
 * Acceso de servidor a Supabase con la clave secreta (service_role): base de
 * datos (PostgREST) y almacenamiento (Storage). SOLO en el servidor; salta RLS.
 *
 * No incluye el módulo de sesiones (Auth) a propósito: este cliente nunca
 * representa a un usuario, y así funciona dentro de la caché de Next.
 * Devuelve null si Supabase no está configurado (el sitio sigue funcionando).
 */
export type ServerDb = {
  from: PostgrestClient["from"];
  rpc: PostgrestClient["rpc"];
  storage: StorageClient;
};

let client: ServerDb | null | undefined;

export function supabaseAdmin(): ServerDb | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return (client = null);
  // Las claves nuevas (sb_secret_…) van solo en "apikey"; las antiguas (JWT) también en Authorization.
  const headers: Record<string, string> = { apikey: key };
  if (key.split(".").length === 3) headers.Authorization = `Bearer ${key}`;
  const rest = new PostgrestClient(`${url}/rest/v1`, { headers });
  client = {
    from: rest.from.bind(rest),
    rpc: rest.rpc.bind(rest),
    storage: new StorageClient(`${url}/storage/v1`, headers),
  };
  return client;
}
