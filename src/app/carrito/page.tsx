import type { Metadata } from "next";
import { CartClient } from "./CartClient";

export const metadata: Metadata = { title: "Carrito", robots: { index: false } };

export default function CartPage() {
  return <CartClient />;
}
