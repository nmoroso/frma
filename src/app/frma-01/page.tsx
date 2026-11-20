import type { Metadata } from "next";
import { CAPSULE } from "@/config/catalog";
import { CapsuleDetail } from "./CapsuleDetail";

export const metadata: Metadata = {
  title: `${CAPSULE.name} — Guardarropa cápsula`,
  description: CAPSULE.tagline,
};

export default function CapsulePage() {
  return <CapsuleDetail />;
}
