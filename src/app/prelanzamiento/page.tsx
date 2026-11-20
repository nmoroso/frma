import type { Metadata } from "next";
import { Suspense } from "react";
import { PrelaunchClient } from "./PrelaunchClient";

export const metadata: Metadata = {
  title: "Prelanzamiento",
  description: "FRMA aún no recibe pedidos ni pagos. Regístrate para recibir el aviso de lanzamiento.",
};

export default function PrelaunchPage() {
  return (
    <Suspense fallback={<div className="container-frma min-h-[60vh]" />}>
      <PrelaunchClient />
    </Suspense>
  );
}
