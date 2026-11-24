"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabasePublicConfig } from "@/lib/supabase/public";

export function LoginForm() {
  const cfg = supabasePublicConfig();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!cfg) {
    return (
      <p className="text-sm text-muted">
        Supabase no está configurado. Agrega <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (ver README).
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createBrowserClient(cfg.url, cfg.anonKey);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setError("Credenciales inválidas.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="admin-email" className="text-sm">Correo</label>
        <input id="admin-email" type="email" autoComplete="username" required className="field mt-2" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="admin-password" className="text-sm">Contraseña</label>
        <input id="admin-password" type="password" autoComplete="current-password" required className="field mt-2" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? "Ingresando…" : "Ingresar"}</button>
    </form>
  );
}

export function LogoutButton() {
  const cfg = supabasePublicConfig();
  const router = useRouter();
  if (!cfg) return null;
  return (
    <button
      type="button"
      className="btn-ghost"
      onClick={async () => {
        await createBrowserClient(cfg.url, cfg.anonKey).auth.signOut();
        router.replace("/admin/login");
        router.refresh();
      }}
    >
      Cerrar sesión
    </button>
  );
}
