import Link from "next/link";
import { HOME } from "@/config/home";
import { activeVariants, shapeFor, usedCategories } from "@/lib/catalog/helpers";
import { getCatalog } from "@/lib/catalog/server";
import type { HomeImage } from "@/lib/catalog/types";
import { HeroText } from "@/components/home/HeroText";
import { CapsuleLink, FeaturedCapsule, HomeEssentials } from "@/components/home/HomeLists";
import { Garment, ProductVisual } from "@/components/product/ProductVisual";
import { LeadForm } from "@/components/forms/LeadForm";

export default async function HomePage() {
  const catalog = await getCatalog();
  const home = catalog.home;
  const hero = home.hero?.[0];
  const categories = usedCategories(catalog).slice(0, 4);

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
          {hero ? (
            <ProductVisual shape="tee" hex="#E9E3D8" image={hero.image} alt={hero.image.alt} className="aspect-[4/5] h-full w-full sm:aspect-[16/11] lg:aspect-auto" priority sizes="(min-width:1024px) 50vw, 100vw" />
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

      {/* BANNERS (panel → Página principal → Banners) */}
      {home.banner?.map((b, i) => <Banner key={`${b.image.src}-${i}`} item={b} />)}

      {/* CÁPSULA DESTACADA */}
      <FeaturedCapsule />

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
          {categories.map((cat) => {
            const custom = home[`category:${cat.id}`]?.[0]?.image;
            const product = catalog.products.find((p) => p.category === cat.id);
            const variant = product ? activeVariants(product)[0] : undefined;
            return (
              <Link key={cat.id} href={`/catalogo?categoria=${cat.id}`} className="group block">
                <ProductVisual shape={cat.shape} hex={variant?.hex ?? "#E9E3D8"} image={custom ?? variant?.images[0]} alt={cat.name} className="aspect-[3/4]" />
                <p className="mt-3 text-sm font-medium">
                  {cat.name} <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </p>
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

      {/* EDITORIAL */}
      {home.editorial?.length ? (
        <section className="container-frma pb-20 sm:pb-24" aria-label="Editorial">
          <div className={`grid gap-3 ${home.editorial.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {home.editorial.slice(0, 4).map((e, i) => (
              <figure key={`${e.image.src}-${i}`}>
                <ProductVisual shape="tee" hex="#E9E3D8" image={e.image} alt={e.image.alt} className={home.editorial!.length > 1 ? "aspect-[4/5]" : "aspect-[16/9]"} sizes="(min-width:640px) 50vw, 100vw" />
                {(e.title || e.subtitle) && (
                  <figcaption className="mt-3">
                    {e.title && <p className="text-sm font-medium">{e.title}</p>}
                    {e.subtitle && <p className="text-sm text-muted">{e.subtitle}</p>}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* DESTACADOS */}
      {home.featured?.length ? (
        <section className="container-frma pb-20 sm:pb-24">
          <p className="eyebrow">Destacados</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {home.featured.slice(0, 8).map((f, i) => {
              const inner = (
                <>
                  <ProductVisual shape="tee" hex="#E9E3D8" image={f.image} alt={f.image.alt} className="aspect-[3/4]" />
                  {f.title && <p className="mt-3 text-sm font-medium">{f.title}</p>}
                  {f.subtitle && <p className="text-xs text-muted">{f.subtitle}</p>}
                </>
              );
              return f.href ? (
                <Link key={i} href={f.href} className="block">{inner}</Link>
              ) : (
                <div key={i}>{inner}</div>
              );
            })}
          </div>
        </section>
      ) : null}

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
          <p className="mt-5 max-w-md text-muted">FRMA aún no recibe pedidos. Déjanos tu correo y te avisamos cuando abramos, sin spam.</p>
        </div>
        <div className="bg-ivory p-6 sm:p-10">
          <LeadForm origin="home" />
        </div>
      </section>
    </>
  );
}

function Banner({ item }: { item: HomeImage }) {
  const content = (
    <div className="relative">
      <ProductVisual shape="tee" hex="#E9E3D8" image={item.image} alt={item.image.alt} className="aspect-[4/5] w-full sm:aspect-[21/9]" sizes="100vw" />
      {(item.title || item.subtitle) && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent p-6 text-paper sm:p-12">
          {item.title && <p className="text-3xl font-light tracking-tight sm:text-5xl">{item.title}</p>}
          {item.subtitle && <p className="mt-2 max-w-lg text-sm sm:text-base">{item.subtitle}</p>}
          {item.href && <span className="mt-4 inline-block text-sm underline underline-offset-4">Ver más</span>}
        </div>
      )}
    </div>
  );
  return <section className="pb-20 sm:pb-28">{item.href ? <Link href={item.href}>{content}</Link> : content}</section>;
}

/** Composición editorial con ilustraciones mientras no haya fotografía propia. */
function HeroComposition() {
  return (
    <div className="relative aspect-[4/5] h-full w-full overflow-hidden bg-sand sm:aspect-[16/11] lg:aspect-auto" role="img" aria-label="Composición de prendas FRMA: polo crudo, camisa oxford celeste y chino beige">
      <div className="absolute left-[6%] top-[8%] h-[62%] w-[52%] -rotate-6"><Garment shape={shapeFor("camisas")} hex="#B9CCE0" /></div>
      <div className="absolute right-[4%] top-[14%] h-[56%] w-[48%] rotate-3"><Garment shape="polo" hex="#E9E2D3" /></div>
      <div className="absolute bottom-[2%] left-[26%] h-[56%] w-[46%] rotate-2"><Garment shape="chino" hex="#CDBB9C" /></div>
      <span className="absolute bottom-3 right-4 text-[10px] uppercase tracking-[0.14em] text-muted/80">Ilustración · fotografía próximamente</span>
    </div>
  );
}
