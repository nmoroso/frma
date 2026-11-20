import Link from "next/link";
import { CAPSULE, capsuleOutfits, capsulePieces, getColor, PRODUCTS } from "@/config/catalog";
import { HOME } from "@/config/home";
import { HeroText } from "@/components/home/HeroText";
import { CapsuleLink, HomeEssentials } from "@/components/home/HomeLists";
import { CapsuleCollage } from "@/components/product/CapsuleCollage";
import { Garment, ProductVisual } from "@/components/product/ProductVisual";
import { Price } from "@/components/product/Price";
import { LeadForm } from "@/components/forms/LeadForm";

const CATEGORY_TILES = [
  { href: "/catalogo?categoria=poleras", label: "Poleras", productId: "polera-essential", colorId: "gris-carbon" },
  { href: "/catalogo?categoria=pantalones", label: "Pantalones", productId: "chino-everyday", colorId: "beige" },
  { href: "/catalogo?categoria=camisas", label: "Polos", productId: "polo-classic", colorId: "azul-marino" },
  { href: "/catalogo?categoria=camisas", label: "Camisas", productId: "camisa-oxford", colorId: "celeste" },
];

export default function HomePage() {
  const pieces = capsulePieces().length;
  const outfits = capsuleOutfits().length;
  return (
    <>
      {/* HERO */}
      <section className="grid lg:min-h-[calc(100vh-6rem)] lg:grid-cols-2">
        <div className="order-2 flex flex-col justify-center bg-ivory px-4 py-12 sm:px-10 lg:order-1 lg:px-16 lg:py-20">
          <p className="eyebrow">{HOME.hero.eyebrow}</p>
          <div className="mt-5">
            <HeroText />
          </div>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <CapsuleLink className="btn-primary">{HOME.hero.cta}</CapsuleLink>
            <Link href="/catalogo" className="btn-secondary">{HOME.hero.secondaryCta}</Link>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          {HOME.hero.image ? (
            <ProductVisual shape="tee" hex="#E9E3D8" image={HOME.hero.image} alt={HOME.hero.image.alt} className="aspect-[4/5] h-full w-full lg:aspect-auto" priority sizes="(min-width:1024px) 50vw, 100vw" />
          ) : (
            <HeroComposition />
          )}
        </div>
      </section>

      {/* PROPUESTA DE VALOR */}
      <section className="container-frma py-20 sm:py-28">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <h2 className="text-3xl font-light leading-tight tracking-tight sm:text-4xl">{HOME.manifesto.title}</h2>
          <p className="text-lg leading-relaxed text-ink/75">{HOME.manifesto.text}</p>
        </div>
      </section>

      {/* CÁPSULA DESTACADA */}
      <section className="bg-sand/50 py-16 sm:py-24">
        <div className="container-frma grid items-center gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
          <CapsuleCollage className="aspect-[5/4]" />
          <div>
            <p className="eyebrow">Guardarropa cápsula</p>
            <h2 className="display mt-3">{CAPSULE.name}</h2>
            <p className="mt-5 text-lg font-light">{CAPSULE.tagline}</p>
            <div className="mt-8 grid grid-cols-3 border-y border-line py-5 text-center">
              <Stat n={pieces} label="piezas" />
              <Stat n={outfits} label="combinaciones" />
              <Stat n={1} label="decisión" />
            </div>
            <p className="mt-6 text-sm text-muted">
              3 poleras, 2 chinos, 1 polo y 1 camisa oxford.
            </p>
            <p className="mt-2 text-2xl"><Price id={CAPSULE.id} /></p>
            <CapsuleLink className="btn-primary mt-6 w-full sm:w-auto">Ver FRMA 01</CapsuleLink>
          </div>
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="container-frma py-20 sm:py-24">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow">Categorías</p>
            <h2 className="h2 mt-2">Lo esencial, nada más</h2>
          </div>
          <Link href="/catalogo" className="link-underline hidden text-sm sm:inline">Ver todo</Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {CATEGORY_TILES.map((t) => {
            const product = PRODUCTS.find((p) => p.id === t.productId)!;
            const color = getColor(product, t.colorId);
            return (
              <Link key={t.label} href={t.href} className="group block">
                <ProductVisual shape={product.shape} hex={color.hex} image={color.images[0]} alt={t.label} className="aspect-[3/4]" />
                <p className="mt-3 text-sm font-medium">{t.label} <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">→</span></p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ESENCIALES */}
      <section className="container-frma pb-20 sm:pb-24">
        <p className="eyebrow">Prendas individuales</p>
        <h2 className="h2 mt-2">Esenciales FRMA</h2>
        <HomeEssentials />
      </section>

      {/* BENEFICIOS */}
      <section className="border-y border-line bg-ivory">
        <div className="container-frma grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {HOME.benefits.map((b) => (
            <div key={b.title}>
              <p className="text-base font-medium">{b.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="container-frma grid gap-10 py-20 sm:py-28 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="eyebrow">Prelanzamiento</p>
          <h2 className="display mt-3">Sé el primero en saberlo.</h2>
          <p className="mt-5 max-w-md text-muted">
            FRMA aún no recibe pedidos. Déjanos tu correo y te avisamos cuando abramos, sin spam.
          </p>
        </div>
        <div className="bg-ivory p-6 sm:p-10">
          <LeadForm origin="home" />
        </div>
      </section>
    </>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <p className="text-3xl font-light">{n}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
    </div>
  );
}

/** Composición editorial con ilustraciones mientras no haya fotografía propia. */
function HeroComposition() {
  return (
    <div className="relative aspect-[4/5] h-full w-full overflow-hidden bg-sand sm:aspect-[16/11] lg:aspect-auto" role="img" aria-label="Composición de prendas FRMA: polo crudo, camisa oxford celeste y chino beige">
      <div className="absolute left-[6%] top-[8%] h-[62%] w-[52%] -rotate-6"><Garment shape="shirt" hex="#B9CCE0" /></div>
      <div className="absolute right-[4%] top-[14%] h-[56%] w-[48%] rotate-3"><Garment shape="polo" hex="#E9E2D3" /></div>
      <div className="absolute bottom-[2%] left-[26%] h-[56%] w-[46%] rotate-2"><Garment shape="chino" hex="#CDBB9C" /></div>
      <span className="absolute bottom-3 right-4 text-[10px] uppercase tracking-[0.14em] text-muted/80">Ilustración · fotografía próximamente</span>
    </div>
  );
}
