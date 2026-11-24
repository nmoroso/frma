import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter_Tight } from "next/font/google";
import "./globals.css";
import { SITE } from "@/config/site";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { ConsentBanner } from "@/components/analytics/ConsentBanner";
import { CatalogProvider } from "@/lib/catalog/context";
import { getCatalog } from "@/lib/catalog/server";

const font = Inter_Tight({
  variable: "--font-frma",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    locale: "es_CL",
    type: "website",
    siteName: SITE.name,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const catalog = await getCatalog();
  return (
    <html lang="es-CL" className={`${font.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <CatalogProvider catalog={catalog}>
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:bg-paper focus:p-3">
          Saltar al contenido
        </a>
        {/* Los componentes que leen la ruta van en Suspense (requisito de Cache Components). */}
        <Suspense fallback={<Header static />}>
          <Header />
        </Suspense>
        <main id="contenido" className="flex-1">
          {children}
        </main>
        <Suspense>
          <Footer />
        </Suspense>
        <Suspense>
          <AnalyticsProvider />
          <ConsentBanner />
        </Suspense>
        </CatalogProvider>
      </body>
    </html>
  );
}
