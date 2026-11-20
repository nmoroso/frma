import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Ingreso administrador", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <div className="container-frma max-w-md py-20">
      <h1 className="h2">Panel del experimento</h1>
      <p className="mt-2 text-sm text-muted">Acceso solo para administradores de FRMA.</p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </div>
  );
}
